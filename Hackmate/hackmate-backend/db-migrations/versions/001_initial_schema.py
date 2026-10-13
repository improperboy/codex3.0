"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-08
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "mentor", "participant", "volunteer", name="user_role"), nullable=False),
        sa.Column("tech_stack", sa.Text, nullable=True),
        sa.Column("floor", sa.String(10), nullable=True),
        sa.Column("room", sa.String(10), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    # ── skills ─────────────────────────────────────────────────────────────
    op.create_table(
        "skills",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("category", sa.String(50), default="general"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ── user_skills ────────────────────────────────────────────────────────
    op.create_table(
        "user_skills",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill_id", sa.Integer, sa.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False),
        sa.Column("proficiency_level", sa.Enum("beginner", "intermediate", "advanced", "expert", name="proficiency_level"), default="intermediate"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_user_skills_user", "user_skills", ["user_id"])

    # ── floors ─────────────────────────────────────────────────────────────
    op.create_table(
        "floors",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("floor_number", sa.String(10), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("floor_number", name="uq_floors_number"),
    )

    # ── rooms ──────────────────────────────────────────────────────────────
    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("floor_id", sa.Integer, sa.ForeignKey("floors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("room_number", sa.String(10), nullable=False),
        sa.Column("capacity", sa.Integer, default=4),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_rooms_floor", "rooms", ["floor_id"])

    # ── themes ─────────────────────────────────────────────────────────────
    op.create_table(
        "themes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("color_code", sa.String(7), default="#3B82F6"),
        sa.Column("is_active", sa.Integer, default=1),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )

    # ── teams ──────────────────────────────────────────────────────────────
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("idea", sa.Text, nullable=True),
        sa.Column("problem_statement", sa.Text, nullable=True),
        sa.Column("tech_skills", sa.Text, nullable=True),
        sa.Column("theme_id", sa.Integer, sa.ForeignKey("themes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("leader_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("floor_id", sa.Integer, sa.ForeignKey("floors.id", ondelete="SET NULL"), nullable=True),
        sa.Column("room_id", sa.Integer, sa.ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.Enum("pending", "approved", "rejected", name="team_status"), default="pending"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )
    op.create_index("idx_teams_status", "teams", ["status"])
    op.create_index("idx_teams_leader", "teams", ["leader_id"])

    # ── team_members ───────────────────────────────────────────────────────
    op.create_table(
        "team_members",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", sa.Integer, sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Enum("pending", "approved", "rejected", name="member_status"), default="approved"),
        sa.Column("joined_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_team_members_team", "team_members", ["team_id"])
    op.create_index("idx_team_members_user", "team_members", ["user_id"])

    # ── team_invitations ───────────────────────────────────────────────────
    op.create_table(
        "team_invitations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("team_id", sa.Integer, sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("to_user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Enum("pending", "accepted", "rejected", name="invitation_status"), default="pending"),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("responded_at", sa.DateTime, nullable=True),
    )
    op.create_index("idx_team_invitations_team", "team_invitations", ["team_id"])

    # ── join_requests ──────────────────────────────────────────────────────
    op.create_table(
        "join_requests",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", sa.Integer, sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Enum("pending", "approved", "rejected", "expired", name="join_request_status"), default="pending"),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("responded_at", sa.DateTime, nullable=True),
    )
    op.create_index("idx_join_requests_user_status", "join_requests", ["user_id", "status"])
    op.create_index("idx_join_requests_team_status", "join_requests", ["team_id", "status"])

    # ── team_skill_requirements ────────────────────────────────────────────
    op.create_table(
        "team_skill_requirements",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("team_id", sa.Integer, sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill_id", sa.Integer, sa.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False),
        sa.Column("importance_level", sa.Enum("nice-to-have", "important", "critical", name="importance_level"), default="important"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ── mentoring_rounds ───────────────────────────────────────────────────
    op.create_table(
        "mentoring_rounds",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("round_name", sa.String(255), nullable=False),
        sa.Column("start_time", sa.DateTime, nullable=False),
        sa.Column("end_time", sa.DateTime, nullable=False),
        sa.Column("max_score", sa.Integer, nullable=False, default=100),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Integer, default=1),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ── mentor_assignments ─────────────────────────────────────────────────
    op.create_table(
        "mentor_assignments",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("mentor_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("floor_id", sa.Integer, sa.ForeignKey("floors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("room_id", sa.Integer, sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("mentor_id", "floor_id", "room_id", name="uq_mentor_floor_room"),
    )

    # ── volunteer_assignments ──────────────────────────────────────────────
    op.create_table(
        "volunteer_assignments",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("volunteer_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("floor_id", sa.Integer, sa.ForeignKey("floors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("room_id", sa.Integer, sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ── scores ─────────────────────────────────────────────────────────────
    op.create_table(
        "scores",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("mentor_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("team_id", sa.Integer, sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("round_id", sa.Integer, sa.ForeignKey("mentoring_rounds.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )
    op.create_index("idx_scores_team_round", "scores", ["team_id", "round_id"])

    # ── submissions ────────────────────────────────────────────────────────
    op.create_table(
        "submissions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("team_id", sa.Integer, sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("github_link", sa.String(500), nullable=False),
        sa.Column("live_link", sa.String(500), nullable=True),
        sa.Column("tech_stack", sa.Text, nullable=False),
        sa.Column("demo_video", sa.String(500), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("submitted_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )

    # ── submission_settings ────────────────────────────────────────────────
    op.create_table(
        "submission_settings",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("start_time", sa.DateTime, nullable=False),
        sa.Column("end_time", sa.DateTime, nullable=False),
        sa.Column("is_active", sa.Integer, default=0),
        sa.Column("max_file_size", sa.Integer, default=10485760),
        sa.Column("allowed_extensions", sa.String(255), default="pdf,doc,docx,zip,rar"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )

    # ── github_repositories ────────────────────────────────────────────────
    op.create_table(
        "github_repositories",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("github_url", sa.String(500), nullable=False),
        sa.Column("repository_name", sa.String(255), nullable=False),
        sa.Column("repository_owner", sa.String(255), nullable=False),
        sa.Column("submitted_by", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Enum("verified", "pending", "invalid", name="repo_status"), default="pending"),
        sa.Column("github_data", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    # ── posts (announcements) ──────────────────────────────────────────────
    op.create_table(
        "posts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("link_url", sa.String(500), nullable=True),
        sa.Column("link_text", sa.String(255), nullable=True),
        sa.Column("author_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_pinned", sa.Integer, default=0),
        sa.Column("target_roles", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )

    # ── push_subscriptions ─────────────────────────────────────────────────
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("endpoint", sa.Text, nullable=False),
        sa.Column("p256dh_key", sa.Text, nullable=True),
        sa.Column("auth_key", sa.Text, nullable=True),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("is_active", sa.Integer, default=1),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )

    # ── notification_logs ──────────────────────────────────────────────────
    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("type", sa.String(50), default="general"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("target_roles", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )

    # ── user_notifications ─────────────────────────────────────────────────
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
    op.create_index("idx_user_notifications_user", "user_notifications", ["user_id"])

    # ── notification_preferences ───────────────────────────────────────────
    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("receive_announcements", sa.Integer, default=1),
        sa.Column("receive_support_notifications", sa.Integer, default=1),
        sa.Column("receive_team_updates", sa.Integer, default=1),
        sa.Column("receive_score_updates", sa.Integer, default=1),
        sa.Column("receive_invitation_notifications", sa.Integer, default=1),
        sa.Column("email_notifications", sa.Integer, default=0),
        sa.Column("push_notifications", sa.Integer, default=1),
        sa.Column("quiet_hours_start", sa.Time, default="22:00:00"),
        sa.Column("quiet_hours_end", sa.Time, default="08:00:00"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
    )

    # ── chatbot_logs ───────────────────────────────────────────────────────
    op.create_table(
        "chatbot_logs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question", sa.Text, nullable=False),
        sa.Column("response", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_chatbot_logs_user", "chatbot_logs", ["user_id"])
    op.create_index("idx_chatbot_logs_created", "chatbot_logs", ["created_at"])

    # ── system_settings ────────────────────────────────────────────────────
    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("setting_key", sa.String(100), nullable=False),
        sa.Column("setting_value", sa.Text, nullable=True),
        sa.Column("setting_type", sa.Enum("string", "integer", "boolean", "json", name="setting_type"), default="string"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_public", sa.Integer, default=0),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, onupdate=sa.func.now()),
        sa.UniqueConstraint("setting_key", name="uq_system_settings_key"),
    )

    # ── activity_logs ──────────────────────────────────────────────────────
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer, nullable=True),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_activity_logs_user", "activity_logs", ["user_id"])
    op.create_index("idx_activity_logs_entity", "activity_logs", ["entity_type", "entity_id"])

    # ── support_messages ───────────────────────────────────────────────────
    op.create_table(
        "support_messages",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("from_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_role", sa.Enum("participant", "volunteer", "mentor", name="support_from_role"), nullable=False),
        sa.Column("to_role", sa.Enum("mentor", "volunteer", "admin", name="support_to_role"), nullable=False),
        sa.Column("subject", sa.String(255), nullable=True),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("priority", sa.Enum("low", "medium", "high", "urgent", name="support_priority"), default="medium"),
        sa.Column("floor_id", sa.Integer, nullable=True),
        sa.Column("room_id", sa.Integer, nullable=True),
        sa.Column("status", sa.Enum("open", "in_progress", "resolved", "closed", name="support_status"), default="open"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime, nullable=True),
        sa.Column("resolved_by", sa.Integer, nullable=True),
        sa.Column("resolution_notes", sa.Text, nullable=True),
    )

    # ── mentor_recommendations ─────────────────────────────────────────────
    op.create_table(
        "mentor_recommendations",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("participant_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("mentor_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("match_score", sa.Numeric(5, 2), nullable=False),
        sa.Column("skill_match_details", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("mentor_recommendations")
    op.drop_table("support_messages")
    op.drop_table("activity_logs")
    op.drop_table("system_settings")
    op.drop_table("chatbot_logs")
    op.drop_table("notification_preferences")
    op.drop_table("user_notifications")
    op.drop_table("notification_logs")
    op.drop_table("push_subscriptions")
    op.drop_table("posts")
    op.drop_table("github_repositories")
    op.drop_table("submission_settings")
    op.drop_table("submissions")
    op.drop_table("scores")
    op.drop_table("volunteer_assignments")
    op.drop_table("mentor_assignments")
    op.drop_table("mentoring_rounds")
    op.drop_table("team_skill_requirements")
    op.drop_table("join_requests")
    op.drop_table("team_invitations")
    op.drop_table("team_members")
    op.drop_table("teams")
    op.drop_table("themes")
    op.drop_table("rooms")
    op.drop_table("floors")
    op.drop_table("user_skills")
    op.drop_table("skills")
    op.drop_table("users")
    # Drop named enum types
    op.execute("DROP TYPE IF EXISTS support_status")
    op.execute("DROP TYPE IF EXISTS support_priority")
    op.execute("DROP TYPE IF EXISTS support_to_role")
    op.execute("DROP TYPE IF EXISTS support_from_role")
    op.execute("DROP TYPE IF EXISTS setting_type")
    op.execute("DROP TYPE IF EXISTS repo_status")
    op.execute("DROP TYPE IF EXISTS importance_level")
    op.execute("DROP TYPE IF EXISTS join_request_status")
    op.execute("DROP TYPE IF EXISTS invitation_status")
    op.execute("DROP TYPE IF EXISTS member_status")
    op.execute("DROP TYPE IF EXISTS team_status")
    op.execute("DROP TYPE IF EXISTS proficiency_level")
    op.execute("DROP TYPE IF EXISTS user_role")
