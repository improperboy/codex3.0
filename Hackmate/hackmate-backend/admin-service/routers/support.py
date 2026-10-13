from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, CurrentUser
from schemas.admin import SupportMessageCreate, SupportMessageResolve, SupportMessageResponse
from models.venue import VolunteerAssignment
from services import support_service
from routers.activity_logs import log_activity

router = APIRouter()

VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_STATUSES = {"open", "in_progress", "resolved", "closed"}

# Roles that can send support messages
SENDER_ROLES = {"participant", "volunteer", "mentor"}
# Roles that can receive/manage support messages
RECEIVER_ROLES = {"mentor", "volunteer", "admin"}


# ── Send a support message ─────────────────────────────────────────────────

@router.post("/", response_model=SupportMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: SupportMessageCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role not in SENDER_ROLES:
        raise HTTPException(status_code=403, detail="Only participants, volunteers, and mentors can send support messages")

    if payload.to_role not in RECEIVER_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid to_role. Must be one of: {RECEIVER_ROLES}")

    if payload.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"Invalid priority. Must be one of: {VALID_PRIORITIES}")

    # Auto-attach team location for participants so volunteers can filter by it
    floor_id = payload.floor_id
    room_id = payload.room_id
    if current_user.role == "participant" and (floor_id is None or room_id is None):
        from sqlalchemy import text
        row = db.execute(text("""
            SELECT t.floor_id, t.room_id FROM teams t
            JOIN team_members tm ON tm.team_id = t.id
            WHERE tm.user_id = :uid AND tm.status = 'approved' AND t.status = 'approved'
            LIMIT 1
        """), {"uid": current_user.user_id}).fetchone()
        if row:
            floor_id = row[0]
            room_id = row[1]

    return support_service.create_message(
        db,
        from_id=current_user.user_id,
        from_role=current_user.role,
        to_role=payload.to_role,
        subject=payload.subject,
        message=payload.message,
        priority=payload.priority,
        floor_id=floor_id,
        room_id=room_id,
    )


# ── My sent messages ───────────────────────────────────────────────────────

@router.get("/mine", response_model=list[SupportMessageResponse])
def my_messages(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return support_service.get_messages_for_user(db, current_user.user_id)


# ── List all messages (admin/mentor/volunteer) ─────────────────────────────

@router.get("/", response_model=list[SupportMessageResponse])
def list_messages(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    to_role: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role not in RECEIVER_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")

    # Volunteers see all messages from their assigned floor/room (any to_role)
    # plus messages explicitly directed to volunteer role
    if current_user.role == "volunteer":
        assignments = db.query(VolunteerAssignment).filter(
            VolunteerAssignment.volunteer_id == current_user.user_id
        ).all()
        if not assignments:
            return []

        from models.setting import SupportMessage
        from sqlalchemy import or_, and_

        # Build location conditions across all assigned rooms
        location_conditions = [
            and_(
                SupportMessage.floor_id == a.floor_id,
                SupportMessage.room_id == a.room_id,
            )
            for a in assignments
        ]

        q = db.query(SupportMessage).filter(or_(*location_conditions))
        if status:
            q = q.filter(SupportMessage.status == status)
        if priority:
            q = q.filter(SupportMessage.priority == priority)
        return q.order_by(SupportMessage.created_at.desc()).offset(skip).limit(limit).all()

    # Mentors only see messages directed to their role; admins see all
    effective_to_role = to_role
    if current_user.role == "mentor":
        effective_to_role = "mentor"

    _, items = support_service.get_all_messages(
        db,
        status=status,
        priority=priority,
        to_role=effective_to_role,
        skip=skip,
        limit=limit,
    )
    return items


# ── Get single message ─────────────────────────────────────────────────────

@router.get("/{msg_id}", response_model=SupportMessageResponse)
def get_message(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    msg = support_service.get_message_by_id(db, msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Sender can view their own; receivers can view messages directed to them
    is_sender = msg.from_id == current_user.user_id
    is_receiver = current_user.role == "admin" or msg.to_role == current_user.role

    if not is_sender and not is_receiver:
        raise HTTPException(status_code=403, detail="Access denied")

    return msg


# ── Update status (admin/mentor/volunteer) ─────────────────────────────────

@router.put("/{msg_id}/status", response_model=SupportMessageResponse)
def update_status(
    msg_id: int,
    new_status: str = Query(...),
    payload: SupportMessageResolve = SupportMessageResolve(),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role not in RECEIVER_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")

    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")

    msg = support_service.get_message_by_id(db, msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if current_user.role != "admin" and msg.to_role != current_user.role:
        raise HTTPException(status_code=403, detail="You can only update messages directed to your role")

    res = support_service.update_status(
        db, msg, new_status,
        resolved_by=current_user.user_id,
        resolution_notes=payload.resolution_notes,
    )
    log_activity(db, current_user.user_id, "update_support_status", "support", msg.id, f"Support ticket #{msg.id} marked {new_status}")
    return res


# ── Delete message (admin only) ────────────────────────────────────────────

@router.delete("/{msg_id}", status_code=204)
def delete_message(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    msg = support_service.get_message_by_id(db, msg_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    support_service.delete_message(db, msg)
    log_activity(db, current_user.user_id, "delete_support_message", "support", msg_id, f"Deleted support message #{msg_id}")
