"""Metrics service — record snapshots and trigger risk evaluation."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.metric import MetricSnapshot
from app.services import audit_service


async def record_metric(
    session: AsyncSession,
    *,
    event_id: str,
    metric_key: str,
    value: float,
    source: str,
    actor_role: str,
    now: datetime,
) -> MetricSnapshot:
    """Append a metric snapshot. Caller must commit."""
    snap = MetricSnapshot(
        event_id=event_id,
        metric_key=metric_key,
        value=value,
        source=source,
    )
    session.add(snap)

    await audit_service.log(
        session,
        event_id=event_id,
        actor_role=actor_role,
        action="metric_recorded",
        entity_type="metric_snapshot",
        entity_id=snap.id,
        payload={"metric_key": metric_key, "value": value},
    )

    return snap
