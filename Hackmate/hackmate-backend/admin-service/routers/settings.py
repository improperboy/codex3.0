from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, require_admin, CurrentUser
from models.setting import SystemSetting
from routers.activity_logs import log_activity
from schemas.admin import (
    SettingResponse,
    SettingUpdate,
    TeamManagementSetting,
    TeamManagementResponse,
    DatabaseResetRequest,
    DatabaseResetResponse,
)
from datetime import datetime
import json
from services.cache_service import cache_service
from delete_data import delete_database_data

router = APIRouter()


@router.get("/", response_model=list[SettingResponse])
def list_settings(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    return db.query(SystemSetting).order_by(SystemSetting.setting_key).all()


@router.get("/public", response_model=list[SettingResponse])
def public_settings(db: Session = Depends(get_db)):
    key = "hackmate:settings:v1:public"
    cached = cache_service.get_json(key)
    if cached is not None:
        return cached
    settings = db.query(SystemSetting).filter(SystemSetting.is_public == 1).all()
    data = [SettingResponse.model_validate(s).model_dump(mode="json") for s in settings]
    cache_service.set_json(key, data, ttl_seconds=300)
    return settings



# ── Team Management Settings ───────────────────────────────────────────────
# NOTE: These routes MUST be defined BEFORE the /{key} routes to avoid path conflicts

@router.get("/team-management", response_model=TeamManagementResponse)
def get_team_management_settings(db: Session = Depends(get_db)):
    """Get current team management settings. Public endpoint - anyone can check status."""
    enabled_setting = db.query(SystemSetting).filter(
        SystemSetting.setting_key == "team_management_enabled"
    ).first()
    
    schedule_setting = db.query(SystemSetting).filter(
        SystemSetting.setting_key == "team_management_schedule"
    ).first()
    
    enabled = True  # Default to enabled
    if enabled_setting and enabled_setting.setting_value:
        enabled = enabled_setting.setting_value.lower() in ("true", "1", "yes")
    
    start_time = None
    end_time = None
    
    if schedule_setting and schedule_setting.setting_value:
        try:
            schedule_data = json.loads(schedule_setting.setting_value)
            if schedule_data.get("start_time"):
                start_time = datetime.fromisoformat(schedule_data["start_time"])
            if schedule_data.get("end_time"):
                end_time = datetime.fromisoformat(schedule_data["end_time"])
        except (json.JSONDecodeError, ValueError):
            pass
    
    # Determine if currently active
    is_currently_active = enabled
    if enabled and (start_time or end_time):
        now = datetime.utcnow()
        if start_time and now < start_time:
            is_currently_active = False
        elif end_time and now > end_time:
            is_currently_active = False
    
    return TeamManagementResponse(
        enabled=enabled,
        start_time=start_time,
        end_time=end_time,
        is_currently_active=is_currently_active,
    )


@router.put("/team-management", response_model=TeamManagementResponse)
def update_team_management_settings(
    payload: TeamManagementSetting,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update team management settings. Admin only."""
    require_admin(current_user)
    
    # Parse datetime strings if provided
    start_time = None
    end_time = None
    
    # Handle start_time - check if it's not None and not empty string
    if payload.start_time and payload.start_time.strip():
        try:
            start_time = datetime.fromisoformat(payload.start_time.replace('Z', '+00:00'))
        except (ValueError, AttributeError) as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid start_time format: {str(e)}. Use ISO 8601 format.",
            )
    
    # Handle end_time - check if it's not None and not empty string
    if payload.end_time and payload.end_time.strip():
        try:
            end_time = datetime.fromisoformat(payload.end_time.replace('Z', '+00:00'))
        except (ValueError, AttributeError) as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid end_time format: {str(e)}. Use ISO 8601 format.",
            )
    
    # Validate schedule times
    if start_time and end_time:
        if start_time >= end_time:
            raise HTTPException(
                status_code=400,
                detail="Start time must be before end time",
            )
    
    # Update or create enabled setting
    enabled_setting = db.query(SystemSetting).filter(
        SystemSetting.setting_key == "team_management_enabled"
    ).first()
    
    if enabled_setting:
        enabled_setting.setting_value = "true" if payload.enabled else "false"
    else:
        enabled_setting = SystemSetting(
            setting_key="team_management_enabled",
            setting_value="true" if payload.enabled else "false",
            setting_type="boolean",
            description="Enable or disable team management features (create, join teams)",
            is_public=1,
        )
        db.add(enabled_setting)
    
    # Update or create schedule setting
    schedule_data = {}
    if start_time:
        schedule_data["start_time"] = start_time.isoformat()
    if end_time:
        schedule_data["end_time"] = end_time.isoformat()
    
    # Only serialize if we have actual data
    schedule_value = json.dumps(schedule_data) if schedule_data else None
    
    schedule_setting = db.query(SystemSetting).filter(
        SystemSetting.setting_key == "team_management_schedule"
    ).first()
    
    if schedule_setting:
        schedule_setting.setting_value = schedule_value
    else:
        # Only create if we have data to store
        if schedule_value:
            schedule_setting = SystemSetting(
                setting_key="team_management_schedule",
                setting_value=schedule_value,
                setting_type="json",
                description="Team management schedule (start_time and end_time)",
                is_public=1,
            )
            db.add(schedule_setting)
    
    try:
        db.commit()
        db.refresh(enabled_setting)
        if schedule_setting:
            db.refresh(schedule_setting)
        cache_service.delete_keys(
            "hackmate:settings:v1:public",
            "hackmate:setting:v1:team_management_enabled",
            "hackmate:setting:v1:team_management_schedule",
        )
        log_activity(db, current_user.id, "update_setting", "setting", enabled_setting.id, f"Updated team management settings (enabled: {payload.enabled})")
    except Exception as e:

        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save team management settings: {str(e)}",
        )
    
    # Return current status
    return get_team_management_settings(db)


# ── Database Reset (Admin-only Danger Zone) ───────────────────────────────

@router.post("/reset-database", response_model=DatabaseResetResponse)
def purge_database(
    payload: DatabaseResetRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Deletes all application data from the database excluding admin account(s).
    Requires admin privileges and confirmation phrase 'DELETE ALL DATA'.
    """
    require_admin(current_user)

    if payload.confirmation.strip().upper() != "DELETE ALL DATA":
        raise HTTPException(
            status_code=400,
            detail="Confirmation phrase does not match. Please enter 'DELETE ALL DATA' to proceed.",
        )

    try:
        result = delete_database_data()

        # Invalidate cached items across services
        try:
            cache_service.delete_keys(
                "hackmate:settings:v1:public",
                "hackmate:analytics:stats",
                "hackmate:rankings:top",
            )
        except Exception:
            pass

        # Log admin activity
        try:
            log_activity(
                db,
                current_user.id,
                "reset_database",
                "system",
                0,
                f"Admin {current_user.name} (ID: {current_user.id}) cleared all database data. Preserved {len(result['admins_preserved'])} admins.",
            )
        except Exception:
            pass

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Generic Setting Routes ─────────────────────────────────────────────────
# NOTE: These MUST be defined AFTER specific routes like /team-management

@router.get("/{key}", response_model=SettingResponse)
def get_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    s = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    if not s.is_public:
        require_admin(current_user)
    return s


@router.put("/{key}", response_model=SettingResponse)
def update_setting(
    key: str,
    payload: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    s = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    # Validate team_management_enabled setting (should be boolean)
    if key == "team_management_enabled":
        if payload.setting_value.lower() not in ("true", "false", "1", "0", "yes", "no"):
            raise HTTPException(
                status_code=400,
                detail="team_management_enabled must be a boolean value (true/false, 1/0, yes/no)",
            )

    if key == "min_team_size":
        try:
            val = int(payload.setting_value)
            if val < 1:
                raise ValueError()
        except ValueError:
            raise HTTPException(status_code=400, detail="Minimum team size must be an integer of at least 1")
        
        max_s = db.query(SystemSetting).filter(SystemSetting.setting_key == "max_team_size").first()
        if max_s and max_s.setting_value:
            try:
                max_val = int(max_s.setting_value)
                if val > max_val:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Minimum team size ({val}) cannot be greater than maximum team size ({max_val})",
                    )
            except ValueError:
                pass

    elif key == "max_team_size":
        try:
            val = int(payload.setting_value)
            if val < 1:
                raise ValueError()
        except ValueError:
            raise HTTPException(status_code=400, detail="Maximum team size must be an integer of at least 1")
        
        min_s = db.query(SystemSetting).filter(SystemSetting.setting_key == "min_team_size").first()
        if min_s and min_s.setting_value:
            try:
                min_val = int(min_s.setting_value)
                if val < min_val:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Maximum team size ({val}) cannot be less than minimum team size ({min_val})",
                    )
            except ValueError:
                pass

    s.setting_value = payload.setting_value
    db.commit()
    db.refresh(s)
    cache_service.delete_keys("hackmate:settings:v1:public", f"hackmate:setting:v1:{key}")
    log_activity(db, current_user.id, "update_setting", "setting", s.id, f"Updated setting '{key}' to '{payload.setting_value}'")
    return s

