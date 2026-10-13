"""notification system - push_subscriptions, notifications, notification_preferences

Revision ID: 003
Revises: 002
Create Date: 2026-04-12
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old notification tables if they exist (safe no-op if already absent)
    op.execute("DROP TABLE IF EXISTS user_notifications CASCADE")
    op.execute("DROP TABLE IF EXISTS notification_logs CASCADE")
    op.execute("DROP TABLE IF EXISTS notification_preferences CASCADE")
    op.execute("DROP TABLE IF EXISTS push_subscriptions CASCADE")

    # ── push_subscriptions (one row per device per user) ───────────────────
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("endpoint", sa.String(767), nullable=False),
        sa.Column("p256dh", sa.Text, nullable=False),
        sa.Column("auth", sa.Text, nullable=False),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("last_used_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "endpoint", name="uq_push_sub_user_endpoint"),
    )
    op.create_index("idx_push_subscriptions_user", "push_subscriptions", ["user_id"])

    # ── notifications (in-app history, one row per notification per user) ──
    op.create_table(
        "notifications",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer, "sqlite"), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("url", sa.String(1000), nullable=True),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("is_read", sa.SmallInteger, server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_notifications_user", "notifications", ["user_id"])
    op.create_index("idx_notifications_type", "notifications", ["type"])
    op.create_index(
        "idx_notifications_user_unread",
        "notifications",
        ["user_id", "is_read", "created_at"],
    )

    # ── notification_preferences (per user per type opt-in/out) ───────────
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notification_type", sa.String(100), nullable=False),
        sa.Column("enabled", sa.SmallInteger, server_default="1"),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint("user_id", "notification_type", name="pk_notification_preferences"),
    )


def downgrade() -> None:
    op.drop_table("notification_preferences")
    op.drop_table("notifications")
    op.drop_table("push_subscriptions")

    # Restore old tables
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("endpoint", sa.Text, nullable=True),
        sa.Column("p256dh_key", sa.Text, nullable=True),
        sa.Column("auth_key", sa.Text, nullable=True),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("is_active", sa.Integer, server_default="1"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )
    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("type", sa.String(50), server_default="general"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("target_roles", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )
    op.create_table(
        "user_notifications",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notification_id", sa.Integer, sa.ForeignKey("notification_logs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("read_at", sa.DateTime, nullable=True),
        sa.Column("clicked_at", sa.DateTime, nullable=True),
        sa.Column("dismissed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("receive_announcements", sa.Integer, server_default="1"),
        sa.Column("receive_support_notifications", sa.Integer, server_default="1"),
        sa.Column("receive_team_updates", sa.Integer, server_default="1"),
        sa.Column("receive_score_updates", sa.Integer, server_default="1"),
        sa.Column("receive_invitation_notifications", sa.Integer, server_default="1"),
        sa.Column("email_notifications", sa.Integer, server_default="0"),
        sa.Column("push_notifications", sa.Integer, server_default="1"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )
