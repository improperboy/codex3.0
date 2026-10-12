"""Initial schema — all tables

Revision ID: 0001
Revises:
Create Date: 2026-10-12
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # events
    op.create_table(
        "events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("format", sa.String(20), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("audience", sa.String(200), nullable=False),
        sa.Column("scale_seats", sa.Integer, nullable=False),
        sa.Column("venue_type", sa.String(50)),
        sa.Column("city", sa.String(200)),
        sa.Column("objectives", postgresql.ARRAY(sa.Text), nullable=False, server_default="{}"),
        sa.Column("target_registrations", sa.Integer, nullable=False),
        sa.Column("target_reach", sa.Integer),
        sa.Column("target_partners", sa.Integer),
        sa.Column("brief", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_check_constraint("ck_events_type", "events", "type IN ('hackathon','workshop','bootcamp','webinar_series')")
    op.create_check_constraint("ck_events_format", "events", "format IN ('in_person','hybrid','virtual')")

    # plans
    op.create_table(
        "plans",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("rules_applied", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("engine_version", sa.String(20), nullable=False, server_default="1.0"),
        sa.Column("is_current", sa.Boolean, nullable=False, server_default="true"),
    )
    op.create_index("ix_plans_event_id", "plans", ["event_id"])

    # workstreams
    op.create_table(
        "workstreams",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("plan_id", sa.String(36), sa.ForeignKey("plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("owner_role", sa.String(50), nullable=False),
    )
    op.create_index("ix_workstreams_plan_id", "workstreams", ["plan_id"])

    # milestones
    op.create_table(
        "milestones",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("plan_id", sa.String(36), sa.ForeignKey("plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
    )
    op.create_index("ix_milestones_plan_id", "milestones", ["plan_id"])

    # risks (before tasks because tasks FK to actions which FK to risks)
    op.create_table(
        "risks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rule_key", sa.String(100), nullable=False),
        sa.Column("subject_key", sa.String(200), nullable=False, server_default="global"),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("owner_role", sa.String(50), nullable=False),
        sa.Column("evidence", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("resolution_note", sa.Text),
    )
    op.create_index("ix_risks_event_id", "risks", ["event_id"])
    op.create_index("ix_risks_open", "risks", ["event_id"], postgresql_where=sa.text("resolved_at IS NULL"))
    # Unique partial index: one open risk per rule+subject per event
    op.execute(
        "CREATE UNIQUE INDEX uq_risks_open_rule ON risks (event_id, rule_key, subject_key) WHERE resolved_at IS NULL"
    )
    op.create_check_constraint("ck_risks_severity", "risks", "severity IN ('low','medium','high','critical')")

    # actions
    op.create_table(
        "actions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("risk_id", sa.String(36), sa.ForeignKey("risks.id", ondelete="SET NULL")),
        sa.Column("template_key", sa.String(100), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("rationale", sa.Text, nullable=False),
        sa.Column("owner_role", sa.String(50), nullable=False),
        sa.Column("expected_impact", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("effort", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("urgency", sa.Float, nullable=False, server_default="0.5"),
        sa.Column("status", sa.String(20), nullable=False, server_default="suggested"),
        sa.Column("snoozed_until", sa.DateTime(timezone=True)),
        sa.Column("dismiss_reason", sa.Text),
        sa.Column("checklist_template", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_actions_event_id", "actions", ["event_id"])
    op.create_check_constraint("ck_actions_status", "actions", "status IN ('suggested','accepted','dismissed','snoozed','done')")
    op.create_check_constraint("ck_actions_impact", "actions", "expected_impact IN ('low','medium','high')")
    op.create_check_constraint("ck_actions_effort", "actions", "effort IN ('low','medium','high')")

    # tasks
    op.create_table(
        "tasks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workstream_id", sa.String(36), sa.ForeignKey("workstreams.id", ondelete="SET NULL")),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("owner_role", sa.String(50), nullable=False),
        sa.Column("owner_name", sa.String(200)),
        sa.Column("due_date", sa.Date),
        sa.Column("status", sa.String(20), nullable=False, server_default="todo"),
        sa.Column("source_action_id", sa.String(36), sa.ForeignKey("actions.id", ondelete="SET NULL")),
        sa.Column("success_criterion", sa.Text),
        sa.Column("blocked_reason", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_tasks_event_status_role", "tasks", ["event_id", "status", "owner_role"])
    op.create_check_constraint("ck_tasks_status", "tasks", "status IN ('todo','in_progress','blocked','done')")

    # checklist_items
    op.create_table(
        "checklist_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("done", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("position", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_index("ix_checklist_items_task_id", "checklist_items", ["task_id"])

    # closures
    op.create_table(
        "closures",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("task_id", sa.String(36), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("outcome_note", sa.Text, nullable=False),
        sa.Column("metric_key", sa.String(50)),
        sa.Column("metric_value", sa.Float),
        sa.Column("closed_by", sa.String(50), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_closures_task_id", "closures", ["task_id"])

    # metric_snapshots
    op.create_table(
        "metric_snapshots",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("metric_key", sa.String(50), nullable=False),
        sa.Column("value", sa.Float, nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("source", sa.String(50), nullable=False, server_default="manual"),
    )
    op.create_index("ix_metric_snapshots_event_key_time", "metric_snapshots", ["event_id", "metric_key", "recorded_at"])

    # channels
    op.create_table(
        "channels",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("is_campus", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_top_converting", sa.Boolean, nullable=False, server_default="false"),
    )
    op.create_index("ix_channels_event_id", "channels", ["event_id"])

    # channel_daily_stats
    op.create_table(
        "channel_daily_stats",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("channel_id", sa.String(36), sa.ForeignKey("channels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day", sa.Date, nullable=False),
        sa.Column("visits", sa.Integer, nullable=False, server_default="0"),
        sa.Column("registrations", sa.Integer, nullable=False, server_default="0"),
        sa.UniqueConstraint("channel_id", "day", name="uq_channel_daily"),
    )
    op.create_index("ix_channel_daily_stats_channel_id", "channel_daily_stats", ["channel_id"])

    # partners
    op.create_table(
        "partners",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("tier", sa.String(50), nullable=False, server_default="standard"),
        sa.Column("status", sa.String(20), nullable=False, server_default="prospect"),
        sa.Column("confirmation_due_date", sa.Date),
        sa.Column("fallback_partner_id", sa.String(36), sa.ForeignKey("partners.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_partners_event_id", "partners", ["event_id"])
    op.create_check_constraint("ck_partners_status", "partners", "status IN ('prospect','contacted','confirmed','activated')")

    # logistics_items
    op.create_table(
        "logistics_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("lead_time_days", sa.Integer, nullable=False, server_default="21"),
        sa.Column("lock_date", sa.Date),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_logistics_items_event_id", "logistics_items", ["event_id"])
    op.create_check_constraint("ck_logistics_category", "logistics_items", "category IN ('venue','catering','av','travel','swag')")
    op.create_check_constraint("ck_logistics_status", "logistics_items", "status IN ('pending','in_progress','confirmed','cancelled')")

    # content_items
    op.create_table(
        "content_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel_id", sa.String(36), sa.ForeignKey("channels.id", ondelete="SET NULL")),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("planned_date", sa.Date, nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("owner_role", sa.String(50), nullable=False, server_default="marketing"),
        sa.Column("title", sa.String(200)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_content_items_event_id", "content_items", ["event_id"])

    # audit_events
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_role", sa.String(50), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(36)),
        sa.Column("payload", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_events_event_id", "audit_events", ["event_id"])


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("content_items")
    op.drop_table("logistics_items")
    op.drop_table("partners")
    op.drop_table("channel_daily_stats")
    op.drop_table("channels")
    op.drop_table("metric_snapshots")
    op.drop_table("closures")
    op.drop_table("checklist_items")
    op.drop_table("tasks")
    op.drop_table("actions")
    op.drop_table("risks")
    op.drop_table("milestones")
    op.drop_table("workstreams")
    op.drop_table("plans")
    op.drop_table("events")
