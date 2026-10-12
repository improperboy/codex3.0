"""Events router — create, get, dashboard, metrics."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_stub import RoleDep
from app.core.clock import get_clock
from app.core.sse_broker import broker
from app.db.models.event import Event
from app.db.session import get_session
from app.schemas.brief import Brief
from app.schemas.dashboard import DashboardOut, MetricRecordRequest
from app.schemas.event import EventCreatedOut, EventOut
from app.services import event_service, dashboard_service, metrics_service, snapshot_service, risk_service

router = APIRouter(tags=["events"])


def _get_event_or_404(event: Event | None) -> Event:
    if not event:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Event not found"}},
        )
    return event


@router.post("/events", status_code=status.HTTP_201_CREATED, response_model=EventCreatedOut)
async def create_event(
    brief: Brief,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    async with session.begin():
        ev, plan, task_count = await event_service.create_event(
            session, brief=brief, actor_role=role, now=now
        )
    return EventCreatedOut(
        id=ev.id,
        name=ev.name,
        plan_id=plan.id,
        task_count=task_count,
    )


@router.get("/events/{event_id}", response_model=EventOut)
async def get_event(
    event_id: str,
    session: AsyncSession = Depends(get_session),
):
    ev = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    _get_event_or_404(ev)
    return EventOut(
        id=ev.id,
        name=ev.name,
        type=ev.type,
        format=ev.format,
        start_date=ev.start_date,
        end_date=ev.end_date,
        audience=ev.audience,
        scale_seats=ev.scale_seats,
        venue_type=ev.venue_type,
        city=ev.city,
        objectives=ev.objectives,
        target_registrations=ev.target_registrations,
        target_reach=ev.target_reach,
        target_partners=ev.target_partners,
        created_at=ev.created_at,
    )


@router.get("/events/{event_id}/dashboard", response_model=DashboardOut)
async def get_dashboard(
    event_id: str,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    ev = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    _get_event_or_404(ev)
    return await dashboard_service.get_dashboard(session, ev, now)


@router.post("/events/{event_id}/metrics", status_code=status.HTTP_201_CREATED)
async def record_metric(
    event_id: str,
    req: MetricRecordRequest,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    ev = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    _get_event_or_404(ev)

    async with session.begin():
        snap = await metrics_service.record_metric(
            session,
            event_id=event_id,
            metric_key=req.metric_key,
            value=req.value,
            source=req.source,
            actor_role=role,
            now=now,
        )
        # Re-run risk evaluation
        days_remaining = (ev.start_date - now.date()).days
        snapshot = await snapshot_service.build_snapshot(
            session,
            event_id=event_id,
            event_type=ev.type,
            target_registrations=ev.target_registrations,
            days_remaining=days_remaining,
            now=now,
        )
        await risk_service.evaluate_event(
            session,
            event_id=event_id,
            event_type=ev.type,
            snapshot=snapshot,
            actor_role=role,
            now=now,
            days_remaining=days_remaining,
        )

    broker.publish(event_id, "dashboard.updated")
    return {"id": snap.id, "message": "Metric recorded"}
