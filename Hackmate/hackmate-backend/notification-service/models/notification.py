from sqlalchemy import Column, BigInteger, Integer, SmallInteger, String, Text, DateTime, JSON, UniqueConstraint, PrimaryKeyConstraint, func
from db.database import Base

# All 9 notification type slugs defined in the spec
NOTIFICATION_TYPES = {
    "team_approved",
    "team_rejected",
    "team_join_request",
    "mentor_round_assigned",
    "mentor_signup",
    "project_submitted",
    "support_ticket_assigned",
    "support_ticket_created",
    "announcement_posted",
}


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    endpoint = Column(String(767), nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    user_agent = Column(String(512), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    last_used_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "endpoint", name="uq_push_sub_user_endpoint"),
    )


class Notification(Base):
    """One row per notification per user — powers the in-app bell panel."""
    __tablename__ = "notifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(100), nullable=False, index=True)
    url = Column(String(1000), nullable=True)
    extra_data = Column("metadata", JSON, nullable=True)
    is_read = Column(SmallInteger, server_default="0")
    created_at = Column(DateTime, server_default=func.now())


class NotificationPreference(Base):
    """Per-user per-type opt-in/out. Missing row = opted in (default)."""
    __tablename__ = "notification_preferences"

    user_id = Column(Integer, nullable=False)
    notification_type = Column(String(100), nullable=False)
    enabled = Column(SmallInteger, server_default="1")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        PrimaryKeyConstraint("user_id", "notification_type", name="pk_notification_preferences"),
    )
