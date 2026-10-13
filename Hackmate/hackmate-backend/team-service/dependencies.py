from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
from datetime import datetime
import json


class CurrentUser:
    def __init__(self, user_id: int, role: str, name: str):
        self.user_id = user_id
        self.role = role
        self.name = name


def get_current_user(
    x_user_id: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
) -> CurrentUser:
    if not x_user_id or not x_user_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user identity headers",
        )
    return CurrentUser(user_id=int(x_user_id), role=x_user_role, name=x_user_name or "")


def check_team_management_enabled(db: Session) -> None:
    """
    Check if team management is currently enabled.
    Raises HTTPException if team management is disabled.
    
    This checks both the enabled flag and optional scheduling window.
    """
    def _read_setting(setting_key: str) -> Optional[str]:
        try:
            row = db.execute(
                text("SELECT setting_value FROM system_settings WHERE setting_key = :setting_key"),
                {"setting_key": setting_key},
            ).fetchone()
        except SQLAlchemyError:
            db.rollback()
            return None
        if not row or row[0] is None:
            return None
        return str(row[0]).strip()

    enabled_value = _read_setting("team_management_enabled")
    if enabled_value is None:
        enabled = True
    else:
        normalized = enabled_value.lower()
        if normalized in ("false", "0", "no"):
            enabled = False
        elif normalized in ("true", "1", "yes"):
            enabled = True
        else:
            enabled = True
    
    if not enabled:
        raise HTTPException(
            status_code=403,
            detail="Team management is currently disabled by the administrator",
        )
    
    # Check scheduling window if enabled
    schedule_value = _read_setting("team_management_schedule")

    if schedule_value:
        try:
            schedule_data = json.loads(schedule_value)
            start_time_str = schedule_data.get("start_time")
            end_time_str = schedule_data.get("end_time")
            
            now = datetime.utcnow()
            
            if start_time_str:
                start_time = datetime.fromisoformat(start_time_str)
                if now < start_time:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Team management will be available starting {start_time.strftime('%Y-%m-%d %H:%M UTC')}",
                    )
            
            if end_time_str:
                end_time = datetime.fromisoformat(end_time_str)
                if now > end_time:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Team management closed on {end_time.strftime('%Y-%m-%d %H:%M UTC')}",
                    )
        except (json.JSONDecodeError, ValueError, KeyError):
            # If schedule data is malformed, ignore it and allow access
            pass
