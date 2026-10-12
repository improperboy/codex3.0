"""Plan engine — pure function: brief → operating plan.

No database imports, no I/O. All outputs are deterministic for a given
brief and clock value.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from app.engines.constants import (
    CONTENT_CHANNELS_DEFAULT,
    CONTENT_POSTS_PER_WEEK,
    EVENT_TYPE_WORKSTREAMS,
    LOGISTICS_LEAD_TIMES,
    MILESTONE_TEMPLATES,
    STREAMING_WORKSTREAM,
    TASK_TEMPLATES,
)
from app.schemas.brief import Brief


@dataclass
class TaskSpec:
    title: str
    owner_role: str
    due_date: date
    workstream_name: str
    success_criterion: str | None = None


@dataclass
class WorkstreamSpec:
    name: str
    owner_role: str


@dataclass
class MilestoneSpec:
    title: str
    due_date: date


@dataclass
class ContentItemSpec:
    channel: str
    planned_date: date
    type: str = "post"
    owner_role: str = "marketing"


@dataclass
class LogisticsItemSpec:
    category: str
    title: str
    lead_time_days: int
    lock_date: date
    status: str = "pending"


@dataclass
class PlanSpec:
    workstreams: list[WorkstreamSpec] = field(default_factory=list)
    milestones: list[MilestoneSpec] = field(default_factory=list)
    tasks: list[TaskSpec] = field(default_factory=list)
    content_items: list[ContentItemSpec] = field(default_factory=list)
    logistics_items: list[LogisticsItemSpec] = field(default_factory=list)
    rules_applied: list[str] = field(default_factory=list)
    engine_version: str = "1.0"


def create_plan(brief: Brief, now: datetime) -> PlanSpec:
    """Generate a complete operating plan from a brief.

    Returns a PlanSpec with no database state — the caller persists it.
    """
    plan = PlanSpec()
    today = now.date()
    days_to_event = (brief.start_date - today).days

    # ------------------------------------------------------------------ #
    # Workstreams
    # ------------------------------------------------------------------ #
    base_workstreams = EVENT_TYPE_WORKSTREAMS.get(brief.type, EVENT_TYPE_WORKSTREAMS["hackathon"])
    plan.workstreams = [WorkstreamSpec(**ws) for ws in base_workstreams]

    if brief.format == "hybrid" or brief.needs_streaming:
        plan.workstreams.append(WorkstreamSpec(**STREAMING_WORKSTREAM))
        plan.rules_applied.append("hybrid_adds_streaming_workstream")

    # ------------------------------------------------------------------ #
    # Compressed plan for tight timelines
    # ------------------------------------------------------------------ #
    is_compressed = days_to_event < 14
    compression_factor = 0.5 if is_compressed else 1.0
    if is_compressed:
        plan.rules_applied.append("compressed_plan_under_14_days")

    # ------------------------------------------------------------------ #
    # Tasks from templates
    # ------------------------------------------------------------------ #
    workstream_names = {ws.name for ws in plan.workstreams}
    for ws_name, templates in TASK_TEMPLATES.items():
        if ws_name not in workstream_names:
            continue
        for tmpl in templates:
            # Compress lead times when event is soon
            raw_days = tmpl["days_before"]
            days_before = max(1, int(raw_days * compression_factor))
            due = brief.start_date - timedelta(days=days_before)
            plan.tasks.append(
                TaskSpec(
                    title=tmpl["title"],
                    owner_role=tmpl["owner_role"],
                    due_date=due,
                    workstream_name=ws_name,
                )
            )

    # Catering and AV lock-date tasks
    if brief.needs_catering:
        lock = brief.start_date - timedelta(days=LOGISTICS_LEAD_TIMES["catering"])
        plan.tasks.append(
            TaskSpec(
                title="Confirm catering arrangements by lock date",
                owner_role="operations",
                due_date=lock,
                workstream_name="Operations",
                success_criterion="Catering confirmed in writing",
            )
        )
        plan.rules_applied.append("catering_lock_date_task_added")

    if brief.needs_av:
        lock = brief.start_date - timedelta(days=LOGISTICS_LEAD_TIMES["av"])
        plan.tasks.append(
            TaskSpec(
                title="Book and confirm AV equipment",
                owner_role="operations",
                due_date=lock,
                workstream_name="Operations",
                success_criterion="AV booking confirmed",
            )
        )
        plan.rules_applied.append("av_lock_date_task_added")

    # ------------------------------------------------------------------ #
    # Milestones
    # ------------------------------------------------------------------ #
    for tmpl in MILESTONE_TEMPLATES:
        days_before = tmpl["days_before"]
        ms_date = brief.start_date - timedelta(days=days_before)
        # Don't set milestones in the past for compressed plans
        if ms_date >= today or tmpl["days_before"] == 0:
            plan.milestones.append(MilestoneSpec(title=tmpl["title"], due_date=ms_date))

    # ------------------------------------------------------------------ #
    # Content calendar: posts_per_week across channels for up to 4 weeks
    # ------------------------------------------------------------------ #
    weeks = min(4, max(1, days_to_event // 7))
    channels = CONTENT_CHANNELS_DEFAULT
    post_date = today
    for week in range(weeks):
        for day_offset in range(0, 7, 7 // CONTENT_POSTS_PER_WEEK):
            actual_date = today + timedelta(weeks=week, days=day_offset)
            if actual_date >= brief.start_date:
                break
            for ch in channels:
                plan.content_items.append(
                    ContentItemSpec(channel=ch, planned_date=actual_date)
                )

    # ------------------------------------------------------------------ #
    # Logistics items
    # ------------------------------------------------------------------ #
    logistics_defaults: list[tuple[str, str, str]] = [
        ("venue", "Venue booking", "venue"),
        ("catering", "Catering", "catering"),
        ("av", "AV equipment", "av"),
        ("travel", "Speaker travel", "travel"),
        ("swag", "Swag production", "swag"),
    ]
    # Only add logistics relevant to the event type
    skip_categories: set[str] = set()
    if brief.type == "webinar_series":
        skip_categories = {"venue", "catering", "av", "travel", "swag"}

    for category, title, ltype in logistics_defaults:
        if category in skip_categories:
            continue
        lead = LOGISTICS_LEAD_TIMES.get(category, 21)
        lock = brief.start_date - timedelta(days=lead)
        plan.logistics_items.append(
            LogisticsItemSpec(
                category=category,
                title=title,
                lead_time_days=lead,
                lock_date=lock,
            )
        )

    return plan


def plan_preview(brief: Brief, now: datetime) -> dict:
    """Return plan counts and warnings without persisting anything."""
    today = now.date()
    days_to_event = (brief.start_date - today).days
    plan = create_plan(brief, now)

    warnings: list[str] = []
    if days_to_event < 14:
        warnings.append(
            f"Event is {days_to_event} days away. Plan will be compressed. "
            "Confirm venue and catering this week."
        )
    if brief.format == "hybrid":
        warnings.append("Hybrid format detected — a Streaming workstream will be added.")

    return {
        "task_count": len(plan.tasks),
        "workstream_names": [ws.name for ws in plan.workstreams],
        "milestone_count": len(plan.milestones),
        "content_items": len(plan.content_items),
        "rules_applied": plan.rules_applied,
        "warnings": warnings,
    }
