"""Snapshot service — loads everything the risk engine needs in a fixed number of queries."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.channel import ChannelDailyStat
from app.db.models.content import ContentItem
from app.db.models.logistics import LogisticsItem
from app.db.models.metric import MetricSnapshot
from app.db.models.partner import Partner
from app.db.models.task import Task
from app.db.models.plan import Workstream
from app.engines.risk_engine import (
    ContentSnapshot,
    EventSnapshot,
    LogisticsSnapshot,
    OverdueTaskSnapshot,
    PartnerSnapshot,
    RegistrationSnapshot,
)


async def build_snapshot(
    session: AsyncSession,
    event_id: str,
    event_type: str,
    target_registrations: int,
    days_remaining: int,
    now: datetime,
) -> EventSnapshot:
    """Build an EventSnapshot for the risk engine in a fixed number of queries."""
    today = now.date()

    # 1. Latest metric values
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

    current_registrations = metrics.get("registrations", 0.0)
    total_visits = metrics.get("visits", 0.0)

    # 2. Recent daily registration values for pace calculation
    recent_q = (
        select(MetricSnapshot.value, MetricSnapshot.recorded_at)
        .where(
            MetricSnapshot.event_id == event_id,
            MetricSnapshot.metric_key == "registrations",
        )
        .order_by(MetricSnapshot.recorded_at.desc())
        .limit(30)
    )
    recent_result = await session.execute(recent_q)
    recent_rows = list(recent_result.all())
    recent_values = [float(row.value) for row in reversed(recent_rows)]

    reg_snapshot = RegistrationSnapshot(
        current=current_registrations,
        target=target_registrations,
        days_remaining=days_remaining,
        recent_daily_values=recent_values,
        total_visits=total_visits,
        form_starts=metrics.get("form_starts", 0.0),
    )

    # 3. Partners
    partners_q = select(Partner).where(Partner.event_id == event_id)
    partners_result = await session.execute(partners_q)
    partners = [
        PartnerSnapshot(
            id=p.id,
            name=p.name,
            status=p.status,
            confirmation_due_date=p.confirmation_due_date,
        )
        for p in partners_result.scalars()
    ]

    # 4. Logistics
    logistics_q = select(LogisticsItem).where(LogisticsItem.event_id == event_id)
    logistics_result = await session.execute(logistics_q)
    logistics = [
        LogisticsSnapshot(
            id=li.id,
            category=li.category,
            title=li.title,
            status=li.status,
            lock_date=li.lock_date,
        )
        for li in logistics_result.scalars()
    ]

    # 5. Content behind plan
    planned_q = select(func.count()).where(
        ContentItem.event_id == event_id,
        ContentItem.planned_date <= today,
    )
    planned_count = (await session.execute(planned_q)).scalar() or 0

    published_q = select(func.count()).where(
        ContentItem.event_id == event_id,
        ContentItem.planned_date <= today,
        ContentItem.published_at.isnot(None),
    )
    published_count = (await session.execute(published_q)).scalar() or 0

    content_snapshot = ContentSnapshot(
        total_planned_to_date=int(planned_count),
        total_published_to_date=int(published_count),
    )

    # 6. Overdue tasks grouped by workstream and owner_role
    overdue_q = (
        select(
            Task.owner_role,
            Workstream.name,
            func.count(Task.id).label("cnt"),
            func.array_agg(Task.id).label("ids"),
        )
        .join(Workstream, Task.workstream_id == Workstream.id, isouter=True)
        .where(
            Task.event_id == event_id,
            Task.status.in_(["todo", "in_progress", "blocked"]),
            Task.due_date < today,
        )
        .group_by(Task.owner_role, Workstream.name)
    )
    overdue_result = await session.execute(overdue_q)
    overdue_tasks = [
        OverdueTaskSnapshot(
            workstream_name=row.name or "Unassigned",
            owner_role=row.owner_role,
            count=row.cnt,
            task_ids=row.ids or [],
        )
        for row in overdue_result
    ]

    return EventSnapshot(
        event_id=event_id,
        event_type=event_type,
        registrations=reg_snapshot,
        partners=partners,
        logistics=logistics,
        content=content_snapshot,
        overdue_tasks=overdue_tasks,
    )
