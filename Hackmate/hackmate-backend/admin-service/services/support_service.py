from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models.setting import SupportMessage


VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_STATUSES = {"open", "in_progress", "resolved", "closed"}


def get_all_messages(
    db: Session,
    status: str | None = None,
    priority: str | None = None,
    to_role: str | None = None,
    skip: int = 0,
    limit: int = 50,
    floor_id: int | None = None,
    room_id: int | None = None,
) -> tuple[int, list[SupportMessage]]:
    q = db.query(SupportMessage)
    if status:
        q = q.filter(SupportMessage.status == status)
    if priority:
        q = q.filter(SupportMessage.priority == priority)
    if to_role:
        q = q.filter(SupportMessage.to_role == to_role)
    if floor_id is not None:
        q = q.filter(SupportMessage.floor_id == floor_id)
    if room_id is not None:
        q = q.filter(SupportMessage.room_id == room_id)
    total = q.count()
    items = q.order_by(SupportMessage.created_at.desc()).offset(skip).limit(limit).all()
    return total, items


def get_message_by_id(db: Session, msg_id: int) -> SupportMessage | None:
    return db.query(SupportMessage).filter(SupportMessage.id == msg_id).first()


def get_messages_for_user(db: Session, user_id: int) -> list[SupportMessage]:
    return (
        db.query(SupportMessage)
        .filter(SupportMessage.from_id == user_id)
        .order_by(SupportMessage.created_at.desc())
        .all()
    )


def create_message(
    db: Session,
    from_id: int,
    from_role: str,
    to_role: str,
    subject: str | None,
    message: str,
    priority: str,
    floor_id: int | None,
    room_id: int | None,
) -> SupportMessage:
    msg = SupportMessage(
        from_id=from_id,
        from_role=from_role,
        to_role=to_role,
        subject=subject,
        message=message,
        priority=priority,
        floor_id=floor_id,
        room_id=room_id,
        status="open",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def update_status(
    db: Session,
    msg: SupportMessage,
    new_status: str,
    resolved_by: int | None = None,
    resolution_notes: str | None = None,
) -> SupportMessage:
    msg.status = new_status
    if new_status in ("resolved", "closed"):
        msg.resolved_at = datetime.now(timezone.utc)
        msg.resolved_by = resolved_by
        if resolution_notes:
            msg.resolution_notes = resolution_notes
    db.commit()
    db.refresh(msg)
    return msg


def delete_message(db: Session, msg: SupportMessage) -> None:
    db.delete(msg)
    db.commit()
