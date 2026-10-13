"""
Push service — subscription management, notification history, preferences,
and Web Push delivery per the HackMate Notification System spec.
"""
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from models.notification import (
    PushSubscription, Notification, NotificationPreference, NOTIFICATION_TYPES
)
from models.announcement import Post
from schemas.notification import (
    AnnouncementCreate, AnnouncementUpdate,
    PushSubscribeRequest, PreferenceUpdate,
)
from config import settings

logger = logging.getLogger(__name__)


# ── Announcements ──────────────────────────────────────────────────────────

def get_announcements(db: Session, role: str | None = None, skip: int = 0, limit: int = 50):
    q = db.query(Post)
    if role and role != "admin":
        q = q.filter(
            (Post.target_roles == None) |  # noqa: E711
            (Post.target_roles.like(f'%"{role}"%'))
        )
    total = q.count()
    posts = q.order_by(Post.is_pinned.desc(), Post.created_at.desc()).offset(skip).limit(limit).all()
    return total, posts


def get_announcement_by_id(db: Session, post_id: int) -> Post | None:
    return db.query(Post).filter(Post.id == post_id).first()


def create_announcement(db: Session, payload: AnnouncementCreate, author_id: int) -> Post:
    p = Post(
        title=payload.title,
        content=payload.content,
        link_url=payload.link_url,
        link_text=payload.link_text,
        author_id=author_id,
        is_pinned=payload.is_pinned,
        target_roles=payload.target_roles,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def update_announcement(db: Session, post: Post, payload: AnnouncementUpdate) -> Post:
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(post, field, value)
    db.commit()
    db.refresh(post)
    return post


def delete_announcement(db: Session, post: Post) -> None:
    db.delete(post)
    db.commit()


# ── Push subscriptions ─────────────────────────────────────────────────────

def subscribe(db: Session, user_id: int, payload: PushSubscribeRequest) -> PushSubscription:
    """Upsert subscription — INSERT ... ON CONFLICT DO UPDATE."""
    stmt = pg_insert(PushSubscription).values(
        user_id=user_id,
        endpoint=payload.endpoint,
        p256dh=payload.p256dh,
        auth=payload.auth,
        user_agent=payload.user_agent,
        last_used_at=datetime.now(timezone.utc),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["endpoint"],
        set_={
            "auth": payload.auth,
            "p256dh": payload.p256dh,
            "last_used_at": datetime.now(timezone.utc),
        },
    )
    db.execute(stmt)
    db.commit()
    return db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id,
        PushSubscription.endpoint == payload.endpoint,
    ).first()


def unsubscribe(db: Session, user_id: int, endpoint: str) -> bool:
    sub = db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id,
        PushSubscription.endpoint == endpoint,
    ).first()
    if not sub:
        return False
    db.delete(sub)
    db.commit()
    return True


def get_user_subscriptions(db: Session, user_id: int) -> list[PushSubscription]:
    return db.query(PushSubscription).filter(PushSubscription.user_id == user_id).all()


def delete_subscription_by_endpoint(db: Session, endpoint: str) -> None:
    """Called when push server returns 410 Gone — stale subscription cleanup."""
    db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).delete()
    db.commit()


# ── Notification history ───────────────────────────────────────────────────

def save_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notif_type: str,
    url: str = "/",
    metadata: dict | None = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notif_type,
        url=url,
        extra_data=metadata,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def get_user_notifications(db: Session, user_id: int, limit: int = 20) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )


def mark_notification_read(db: Session, user_id: int, notification_id: int) -> bool:
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    ).first()
    if not n:
        return False
    n.is_read = 1
    db.commit()
    return True


def mark_all_read(db: Session, user_id: int) -> int:
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == 0)
        .update({"is_read": 1})
    )
    db.commit()
    return count


def get_unread_count(db: Session, user_id: int) -> int:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == 0)
        .count()
    )


# ── Preferences ────────────────────────────────────────────────────────────

def is_opted_in(db: Session, user_id: int, notification_type: str) -> bool:
    """Returns True if user should receive this type. Missing row = opted in."""
    pref = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id,
        NotificationPreference.notification_type == notification_type,
    ).first()
    if pref is None:
        return True  # default: opted in
    return bool(pref.enabled)


def get_preferences(db: Session, user_id: int) -> list[NotificationPreference]:
    rows = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id
    ).all()
    # Fill in defaults for types not yet stored
    stored = {r.notification_type for r in rows}
    result = list(rows)
    for t in NOTIFICATION_TYPES:
        if t not in stored:
            result.append(NotificationPreference(user_id=user_id, notification_type=t, enabled=1))
    return result


def update_preferences(db: Session, user_id: int, payload: PreferenceUpdate) -> list[NotificationPreference]:
    for item in payload.preferences:
        stmt = pg_insert(NotificationPreference).values(
            user_id=user_id,
            notification_type=item.notification_type,
            enabled=1 if item.enabled else 0,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["user_id", "notification_type"],
            set_={"enabled": 1 if item.enabled else 0},
        )
        db.execute(stmt)
    db.commit()
    return get_preferences(db, user_id)


# ── Web Push delivery ──────────────────────────────────────────────────────

async def send_web_push(
    db: Session,
    subscription: PushSubscription,
    title: str,
    message: str,
    url: str = "/",
    notif_type: str = "announcement_posted",
) -> bool:
    """
    Send a single Web Push. Returns True on success.
    Deletes subscription on 410 Gone. Raises on retryable errors.
    """
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.warning("VAPID keys not configured — skipping push")
        return False

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.error("pywebpush not installed")
        return False

    payload = json.dumps({
        "title": title,
        "message": message,
        "url": url,
        "tag": notif_type,
        "icon": "/logo.png",
    })

    import asyncio

    try:
        def do_push():
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": f"mailto:{settings.vapid_claims_email}"},
            )
        
        await asyncio.to_thread(do_push)
        # Update last_used_at on success
        subscription.last_used_at = datetime.now(timezone.utc)
        db.commit()
        return True

    except Exception as exc:
        # Check for 410 Gone — stale subscription
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        if status_code == 410:
            logger.info("410 Gone — deleting stale subscription endpoint=%s", subscription.endpoint)
            delete_subscription_by_endpoint(db, subscription.endpoint)
            return True  # not a failure, just cleanup

        logger.warning("Push failed for endpoint=%s: %s", subscription.endpoint, exc)
        raise  # re-raise for retry logic in consumer
