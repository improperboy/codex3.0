from pydantic import BaseModel, field_validator
from typing import Optional, Any
from datetime import datetime
from models.notification import NOTIFICATION_TYPES


# ── Announcements (unchanged) ──────────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    is_pinned: int = 0
    target_roles: Optional[str] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    is_pinned: Optional[int] = None
    target_roles: Optional[str] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    author_id: int
    is_pinned: int
    target_roles: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Push subscriptions ─────────────────────────────────────────────────────

class PushSubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    user_agent: Optional[str] = None


class PushSubscriptionResponse(BaseModel):
    id: int
    user_id: int
    endpoint: str
    created_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Notifications ──────────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    url: Optional[str] = None
    extra_data: Optional[Any] = None
    is_read: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Preferences ────────────────────────────────────────────────────────────

class PreferenceItem(BaseModel):
    notification_type: str
    enabled: bool

    @field_validator("notification_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in NOTIFICATION_TYPES:
            raise ValueError(f"Unknown notification type: {v}")
        return v


class PreferenceUpdate(BaseModel):
    preferences: list[PreferenceItem]


class PreferenceResponse(BaseModel):
    notification_type: str
    enabled: bool

    class Config:
        from_attributes = True


# ── Redis stream event (published by other services) ──────────────────────

class StreamEvent(BaseModel):
    user_id: int
    title: str
    message: str
    type: str
    url: Optional[str] = "/"
    metadata: Optional[str] = None  # JSON-encoded string
