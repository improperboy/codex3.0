"""Dashboard service — assemble KPIs and summaries in a fixed number of queries."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.event import Event
from app.db.models.metric import MetricSnapshot
from app.db.models.plan import Milestone, Plan, Workstream
from app.db.models.risk import Action, Risk
from app.db.models.task import Task
from app.schemas.dashboard import (
    ActionSummaryOut,
    DashboardOut,
    KpiOut,
    RiskSummaryOut,
    WorkstreamSummaryOut,
)

SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}
HEALTH_MAP = {4: "off_track", 3: "at_risk", 2: "at_risk", 1: "on_track", 0: "on_track"}


async def get_dashboard(
    session: AsyncSession,
    event: Event,
    now: datetime,
) -> DashboardOut:
    today = now.date()
    event_id = event.id
    days_remaining = (event.start_date - today).days

    # 1. Latest metrics
    latest_q = (
        select(
            MetricSnapshot.metric_key,
            func.max(MetricSnapshot.recorded_at).label("max_at"),
        )
        .where(MetricSnapshot.event_id == event_id)
        .group_by(MetricSnapshot.metric_key)
        .subquery()
    )
    metrics_q = select(MetricSnapshot).join(
        latest_q,
        (MetricSnapshot.metric_key == latest_q.c.metric_key)
        & (MetricSnapshot.recorded_at == latest_q.c.max_at),
    ).where(MetricSnapshot.event_id == event_id)
    metrics_result = await session.execute(metrics_q)
    metrics: dict[str, float] = {m.metric_key: m.value for m in metrics_result.scalars()}

    # Pace calculation
    recent_q = (
        select(MetricSnapshot.value)
        .where(
            MetricSnapshot.event_id == event_id,
            MetricSnapshot.metric_key == "registrations",
        )
        .order_by(MetricSnapshot.recorded_at.desc())
        .limit(15)
    )
    recent = list((await session.execute(recent_q)).scalars())
    current_pace: float | None = None
    required_pace: float | None = None
    if len(recent) >= 2:
        diffs = [max(0, recent[i - 1] - recent[i]) for i in range(1, len(recent))]
        current_pace = sum(diffs) / len(diffs) if diffs else 0.0
    if days_remaining > 0 and event.target_registrations:
        current_reg = metrics.get("registrations", 0)
        required_pace = max(0.0, (event.target_registrations - current_reg) / days_remaining)

    # 2. Open and overdue tasks
    task_counts_q = (
        select(Task.status, func.count(Task.id).label("cnt"))
        .where(Task.event_id == event_id)
        .group_by(Task.status)
    )
    task_counts = {row.status: row.cnt for row in (await session.execute(task_counts_q))}
    open_tasks = sum(v for k, v in task_counts.items() if k != "done")

    overdue_q = select(func.count(Task.id)).where(
        Task.event_id == event_id,
        Task.status.in_(["todo", "in_progress", "blocked"]),
        Task.due_date < today,
    )
    overdue_tasks = (await session.execute(overdue_q)).scalar() or 0

    # 3. Open risks
    risks_q = (
        select(Risk)
        .where(Risk.event_id == event_id, Risk.resolved_at.is_(None))
        .order_by(Risk.severity.desc())
    )
    risks = list((await session.execute(risks_q)).scalars())

    max_severity = max((SEVERITY_ORDER.get(r.severity, 0) for r in risks), default=0)
    health_label = HEALTH_MAP.get(max_severity, "on_track")

    top_risks = [
        RiskSummaryOut(
            id=r.id,
            type=r.type,
            severity=r.severity,
            owner_role=r.owner_role,
            evidence_summary=_format_evidence(r),
        )
        for r in sorted(risks, key=lambda r: -SEVERITY_ORDER.get(r.severity, 0))[:5]
    ]

    # Last evaluation time = most recently detected/updated risk
    evaluated_at = max((r.detected_at for r in risks), default=None)

    # 4. Top recommendations
    actions_q = (
        select(Action)
        .where(Action.event_id == event_id, Action.status == "suggested")
        .order_by(ActionModel.urgency.desc())
        .limit(5)
    )
    actions = list((await session.execute(actions_q)).scalars())

    top_recommendations = [
        ActionSummaryOut(
            id=a.id,
            title=a.title,
            owner_role=a.owner_role,
            expected_impact=a.expected_impact,
            effort=a.effort,
            urgency=a.urgency,
            rationale=a.rationale,
        )
        for a in actions
    ]

    # 5. Workstream summaries
    plan_q = select(Plan).where(Plan.event_id == event_id, Plan.is_current == True)  # noqa: E712
    plan = (await session.execute(plan_q)).scalars().first()

    workstream_summaries: list[WorkstreamSummaryOut] = []
    if plan:
        ws_q = select(Workstream).where(Workstream.plan_id == plan.id)
        workstreams = list((await session.execute(ws_q)).scalars())

        for ws in workstreams:
            ws_tasks_q = (
                select(Task.status, func.count(Task.id).label("cnt"))
                .where(Task.event_id == event_id, Task.workstream_id == ws.id)
                .group_by(Task.status)
            )
            ws_counts = {row.status: row.cnt for row in (await session.execute(ws_tasks_q))}
            ws_total = sum(ws_counts.values())
            ws_done = ws_counts.get("done", 0)
            ws_overdue_q = select(func.count(Task.id)).where(
                Task.event_id == event_id,
                Task.workstream_id == ws.id,
                Task.status.in_(["todo", "in_progress", "blocked"]),
                Task.due_date < today,
            )
            ws_overdue = (await session.execute(ws_overdue_q)).scalar() or 0

            next_ms_q = (
                select(Milestone)
                .where(Milestone.plan_id == plan.id, Milestone.due_date >= today)
                .order_by(Milestone.due_date)
                .limit(1)
            )
            next_ms = (await session.execute(next_ms_q)).scalars().first()

            workstream_summaries.append(
                WorkstreamSummaryOut(
                    workstream_id=ws.id,
                    name=ws.name,
                    owner_role=ws.owner_role,
                    total_tasks=ws_total,
                    done_tasks=ws_done,
                    overdue_tasks=ws_overdue,
                    next_milestone_title=next_ms.title if next_ms else None,
                    next_milestone_date=next_ms.due_date.isoformat() if next_ms else None,
                )
            )

    # Build KPIs
    content_published = metrics.get("content_published", 0)
    from app.db.models.content import ContentItem
    content_q = select(func.count()).where(ContentItem.event_id == event_id)
    content_total = (await session.execute(content_q)).scalar() or 0

    return DashboardOut(
        event_id=event_id,
        health_label=health_label,
        days_remaining=days_remaining,
        registrations=KpiOut(
            value=metrics.get("registrations"),
            target=event.target_registrations,
            pace=current_pace,
            required_pace=required_pace,
        ),
        reach=KpiOut(
            value=metrics.get("reach"),
            target=event.target_reach,
        ),
        partners=KpiOut(
            value=metrics.get("partners_activated"),
            target=event.target_partners,
        ),
        open_tasks=open_tasks,
        overdue_tasks=overdue_tasks,
        content_published=KpiOut(
            value=content_published,
            target=float(content_total) if content_total else None,
        ),
        top_risks=top_risks,
        top_recommendations=top_recommendations,
        workstreams=workstream_summaries,
        evaluated_at=evaluated_at,
    )


def _format_evidence(risk: Risk) -> str:
    ev = risk.evidence
    if risk.rule_key == "registration_pace_low":
        return f"Pace {ev.get('current_pace', 0):.1f}/day vs {ev.get('required_pace', 0):.1f} required"
    if risk.rule_key == "conversion_low":
        return f"Conversion {ev.get('conversion', 0):.1%} vs {ev.get('threshold', 0):.0%} threshold"
    if risk.rule_key == "partner_confirmation_late":
        return f"{ev.get('partner_name', 'Partner')} {ev.get('days_late', 0)} days late"
    if risk.rule_key == "logistics_unconfirmed":
        return f"{ev.get('title', 'Item')} — {ev.get('days_to_lock', 0)} days to lock date"
    if risk.rule_key == "content_behind_plan":
        return f"{ev.get('behind_count', 0)} posts behind plan"
    if risk.rule_key == "tasks_overdue":
        return f"{ev.get('count', 0)} tasks overdue in {ev.get('workstream', '')}"
    return ""
