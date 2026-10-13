from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, require_admin, CurrentUser
from models.setting import ActivityLog
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class ActivityLogCreate(BaseModel):
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None


class ActivityLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


def log_activity(
    db: Session,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    details: str | None = None,
) -> None:
    """Utility to write an activity log entry. Safe to call from any router."""
    try:
        entry = ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to log activity: {e}")
        try:
            db.rollback()
        except Exception:
            pass


def _seed_initial_activity_if_empty(db: Session) -> None:
    """If the activity log table is empty, generate initial audit entries from existing records."""
    try:
        has_any = db.query(ActivityLog.id).first()
        if has_any:
            return

        entries = []

        # 1. Backfill from users
        user_rows = db.execute(
            text("SELECT id, name, email, role, created_at FROM users ORDER BY id ASC LIMIT 50")
        ).fetchall()
        for r in user_rows:
            entries.append(
                ActivityLog(
                    user_id=r[0],
                    action="user_register",
                    entity_type="user",
                    entity_id=r[0],
                    details=f"User {r[1]} registered as {r[3]} ({r[2]})",
                    created_at=r[4] if r[4] else datetime.utcnow(),
                )
            )

        # 2. Backfill from teams
        team_rows = db.execute(
            text("SELECT id, name, tech_skills, floor_id, room_id, status, leader_id, created_at FROM teams ORDER BY id ASC LIMIT 50")
        ).fetchall()
        for t in team_rows:
            entries.append(
                ActivityLog(
                    user_id=t[6],
                    action="create_team",
                    entity_type="team",
                    entity_id=t[0],
                    details=f"Team '{t[1]}' created with tech: {t[2] or 'general'}",
                    created_at=t[7] if t[7] else datetime.utcnow(),
                )
            )
            if t[3] and t[4]:
                entries.append(
                    ActivityLog(
                        user_id=t[6],
                        action="assign_team_room",
                        entity_type="team",
                        entity_id=t[0],
                        details=f"Team '{t[1]}' assigned to floor #{t[3]}, room #{t[4]}",
                        created_at=t[7] if t[7] else datetime.utcnow(),
                    )
                )

        # 3. Backfill from mentor assignments
        mentor_rows = db.execute(
            text("SELECT id, mentor_id, floor_id, room_id, created_at FROM mentor_assignments ORDER BY id ASC LIMIT 50")
        ).fetchall()
        for m in mentor_rows:
            entries.append(
                ActivityLog(
                    user_id=m[1],
                    action="assign_mentor_room",
                    entity_type="mentor",
                    entity_id=m[1],
                    details=f"Mentor #{m[1]} assigned to floor #{m[2]}, room #{m[3]}",
                    created_at=m[4] if m[4] else datetime.utcnow(),
                )
            )

        # 4. Backfill from floors & rooms
        room_rows = db.execute(
            text("SELECT r.id, r.room_number, f.floor_number, r.created_at FROM rooms r JOIN floors f ON f.id = r.floor_id LIMIT 20")
        ).fetchall()
        for rm in room_rows:
            entries.append(
                ActivityLog(
                    user_id=None,
                    action="create_room",
                    entity_type="venue",
                    entity_id=rm[0],
                    details=f"Room {rm[1]} created on floor {rm[2]}",
                    created_at=rm[3] if rm[3] else datetime.utcnow(),
                )
            )

        if entries:
            for entry in entries:
                db.add(entry)
            db.commit()
    except Exception as e:
        logger.warning(f"Failed to seed initial activity logs: {e}")
        try:
            db.rollback()
        except Exception:
            pass


@router.get("", response_model=list[ActivityLogResponse])
@router.get("/", response_model=list[ActivityLogResponse])
def list_activity_logs(
    user_id: int | None = Query(None),
    entity_type: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)

    # Check and backfill if completely empty
    _seed_initial_activity_if_empty(db)

    # Fetch logs joined with users to provide user_name and user_email
    sql = """
        SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.details, a.created_at,
               u.name as user_name, u.email as user_email
        FROM activity_logs a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE 1=1
    """
    params = {}
    if user_id is not None:
        sql += " AND a.user_id = :user_id"
        params["user_id"] = user_id
    if entity_type:
        sql += " AND a.entity_type = :entity_type"
        params["entity_type"] = entity_type

    sql += " ORDER BY a.created_at DESC, a.id DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip

    try:
        rows = db.execute(text(sql), params).fetchall()
        result = []
        for r in rows:
            result.append(
                ActivityLogResponse(
                    id=r[0],
                    user_id=r[1],
                    action=r[2],
                    entity_type=r[3],
                    entity_id=r[4],
                    details=r[5],
                    created_at=r[6],
                    user_name=r[7],
                    user_email=r[8],
                )
            )
        return result
    except Exception as e:
        logger.warning(f"Error querying joined activity logs, falling back to ORM: {e}")
        q = db.query(ActivityLog)
        if user_id:
            q = q.filter(ActivityLog.user_id == user_id)
        if entity_type:
            q = q.filter(ActivityLog.entity_type == entity_type)
        items = q.order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc()).offset(skip).limit(limit).all()
        return [
            ActivityLogResponse(
                id=item.id,
                user_id=item.user_id,
                action=item.action,
                entity_type=item.entity_type,
                entity_id=item.entity_id,
                details=item.details,
                created_at=item.created_at,
            )
            for item in items
        ]


@router.post("", response_model=ActivityLogResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ActivityLogResponse, status_code=status.HTTP_201_CREATED)
def create_activity_log(
    payload: ActivityLogCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    entry = ActivityLog(
        user_id=current_user.id,
        action=payload.action,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        details=payload.details,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return ActivityLogResponse(
        id=entry.id,
        user_id=entry.user_id,
        user_name=current_user.name,
        action=entry.action,
        entity_type=entry.entity_type,
        entity_id=entry.entity_id,
        details=entry.details,
        created_at=entry.created_at,
    )
