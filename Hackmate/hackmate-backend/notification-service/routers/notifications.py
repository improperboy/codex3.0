from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, CurrentUser
from models.notification import NOTIFICATION_TYPES
from schemas.notification import (
    PushSubscribeRequest, PushSubscriptionResponse,
    NotificationResponse,
    PreferenceUpdate, PreferenceResponse,
)
from services import push_service

router = APIRouter()


# ── POST /notifications/subscribe ─────────────────────────────────────────

@router.post("/subscribe", response_model=PushSubscriptionResponse, status_code=200)
def subscribe(
    payload: PushSubscribeRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    sub = push_service.subscribe(db, current_user.user_id, payload)
    return sub


# ── DELETE /notifications/subscribe ───────────────────────────────────────

@router.delete("/subscribe", status_code=200)
def unsubscribe(
    payload: PushSubscribeRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    removed = push_service.unsubscribe(db, current_user.user_id, payload.endpoint)
    if not removed:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Unsubscribed"}


# ── GET /notifications ─────────────────────────────────────────────────────

@router.get("/", response_model=list[NotificationResponse])
def get_notifications(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return push_service.get_user_notifications(db, current_user.user_id, limit=limit)


# ── GET /notifications/unread-count ───────────────────────────────────────

@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return {"unread": push_service.get_unread_count(db, current_user.user_id)}


# ── POST /notifications/{id}/read ─────────────────────────────────────────

@router.post("/{notification_id}/read", status_code=200)
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    ok = push_service.mark_notification_read(db, current_user.user_id, notification_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


# ── POST /notifications/mark-all-read ─────────────────────────────────────

@router.post("/mark-all-read", status_code=200)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    count = push_service.mark_all_read(db, current_user.user_id)
    return {"marked": count}


# ── GET /notifications/preferences ────────────────────────────────────────

@router.get("/preferences", response_model=list[PreferenceResponse])
def get_preferences(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return push_service.get_preferences(db, current_user.user_id)


# ── PUT /notifications/preferences ────────────────────────────────────────

@router.put("/preferences", response_model=list[PreferenceResponse])
def update_preferences(
    payload: PreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return push_service.update_preferences(db, current_user.user_id, payload)


# ── GET /notifications/vapid-public-key ───────────────────────────────────

@router.get("/vapid-public-key")
def vapid_public_key():
    """Returns the VAPID public key for the frontend subscription flow."""
    from config import settings
    if not settings.vapid_public_key:
        raise HTTPException(status_code=503, detail="VAPID not configured")
    return {"publicKey": settings.vapid_public_key}
