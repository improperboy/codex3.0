"""Workstreams router — registrations, outreach, partners, content, logistics."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_stub import RoleDep
from app.core.clock import get_clock
from app.core.sse_broker import broker
from app.db.models.channel import Channel, ChannelDailyStat
from app.db.models.content import ContentItem
from app.db.models.event import Event
from app.db.models.logistics import LogisticsItem
from app.db.models.metric import MetricSnapshot
from app.db.models.partner import Partner
from app.db.session import get_session
from app.schemas.workstream import (
    CampaignOut,
    ContentItemOut,
    GapPanelOut,
    FunnelOut,
    LogisticsItemOut,
    LogisticsPatchRequest,
    PartnerOut,
    PartnerPatchRequest,
    RegistrationsOut,
    ChannelStatOut,
)
from app.services import audit_service

router = APIRouter(tags=["workstreams"])

PARTNER_TRANSITIONS = {
    "prospect": {"contacted"},
    "contacted": {"confirmed", "prospect"},
    "confirmed": {"activated", "contacted"},
    "activated": {"confirmed"},
}


def _get_event_or_404(event: Event | None) -> Event:
    if not event:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Event not found"}})
    return event


@router.get("/events/{event_id}/registrations", response_model=RegistrationsOut)
async def get_registrations(
    event_id: str,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    ev = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    _get_event_or_404(ev)

    # Latest metrics
    metrics_q = (
        select(MetricSnapshot.metric_key, func.max(MetricSnapshot.recorded_at).label("max_at"))
        .where(MetricSnapshot.event_id == event_id)
        .group_by(MetricSnapshot.metric_key)
        .subquery()
    )
    mv_q = select(MetricSnapshot).join(
        metrics_q,
        (MetricSnapshot.metric_key == metrics_q.c.metric_key)
        & (MetricSnapshot.recorded_at == metrics_q.c.max_at),
    ).where(MetricSnapshot.event_id == event_id)
    metrics = {m.metric_key: m.value for m in (await session.execute(mv_q)).scalars()}

    visits = metrics.get("visits", 0)
    registrations = metrics.get("registrations", 0)
    form_starts = metrics.get("form_starts", registrations)
    confirmed = metrics.get("confirmed_attendees", registrations)

    conversion = registrations / visits if visits > 0 else 0.0

    days_remaining = max(0, (ev.start_date - now.date()).days)
    required_pace = (ev.target_registrations - registrations) / days_remaining if days_remaining > 0 else 0.0

    # Recent pace
    recent_q = (
        select(MetricSnapshot.value)
        .where(MetricSnapshot.event_id == event_id, MetricSnapshot.metric_key == "registrations")
        .order_by(MetricSnapshot.recorded_at.desc())
        .limit(15)
    )
    recent = list((await session.execute(recent_q)).scalars())
    current_pace = 0.0
    if len(recent) >= 2:
        diffs = [max(0, recent[i - 1] - recent[i]) for i in range(1, len(recent))]
        current_pace = sum(diffs) / len(diffs)

    projected = registrations + current_pace * days_remaining

    # Channel stats
    channels_q = select(Channel).where(Channel.event_id == event_id)
    channels = list((await session.execute(channels_q)).scalars())

    channel_stats: list[ChannelStatOut] = []
    for ch in channels:
        agg_q = select(
            func.sum(ChannelDailyStat.visits).label("v"),
            func.sum(ChannelDailyStat.registrations).label("r"),
        ).where(ChannelDailyStat.channel_id == ch.id)
        row = (await session.execute(agg_q)).first()
        ch_visits = int(row.v or 0)
        ch_regs = int(row.r or 0)
        ch_conv = ch_regs / ch_visits if ch_visits > 0 else 0.0
        channel_stats.append(
            ChannelStatOut(
                channel_id=ch.id,
                name=ch.name,
                visits=ch_visits,
                registrations=ch_regs,
                conversion=round(ch_conv, 4),
                is_campus=ch.is_campus,
                is_top_converting=ch.is_top_converting,
            )
        )

    return RegistrationsOut(
        funnel=FunnelOut(
            visits=visits,
            form_starts=form_starts,
            registrations=registrations,
            confirmed_attendees=confirmed,
            visit_to_registration=round(conversion, 4),
        ),
        gap=GapPanelOut(
            target=ev.target_registrations,
            actual=registrations,
            required_pace=round(required_pace, 2),
            current_pace=round(current_pace, 2),
            projected_finish=round(projected, 1),
            days_remaining=days_remaining,
        ),
        channels=channel_stats,
    )


@router.get("/events/{event_id}/partners", response_model=list[PartnerOut])
async def get_partners(
    event_id: str,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    today = now.date()
    ev = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    _get_event_or_404(ev)

    partners = list((await session.execute(select(Partner).where(Partner.event_id == event_id))).scalars())

    result = []
    for p in partners:
        days_late = None
        if p.confirmation_due_date and p.status not in ("confirmed", "activated"):
            d = (today - p.confirmation_due_date).days
            days_late = d if d > 0 else None
        result.append(
            PartnerOut(
                id=p.id,
                name=p.name,
                tier=p.tier,
                status=p.status,
                confirmation_due_date=p.confirmation_due_date,
                days_late=days_late,
                fallback_partner_id=p.fallback_partner_id,
            )
        )
    return result


@router.patch("/partners/{partner_id}", response_model=PartnerOut)
async def update_partner(
    partner_id: str,
    req: PartnerPatchRequest,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    p_q = select(Partner).where(Partner.id == partner_id)
    p = (await session.execute(p_q)).scalars().first()
    if not p:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Partner not found"}})

    allowed = PARTNER_TRANSITIONS.get(p.status, set())
    if req.status not in allowed:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "invalid_transition", "message": f"Cannot move from {p.status} to {req.status}"}},
        )

    async with session.begin():
        old_status = p.status
        p.status = req.status
        await audit_service.log(
            session,
            event_id=p.event_id,
            actor_role=role,
            action="partner_status_changed",
            entity_type="partner",
            entity_id=partner_id,
            payload={"from": old_status, "to": req.status},
        )

    days_late = None
    if p.confirmation_due_date and p.status not in ("confirmed", "activated"):
        d = (now.date() - p.confirmation_due_date).days
        days_late = d if d > 0 else None

    return PartnerOut(
        id=p.id, name=p.name, tier=p.tier, status=p.status,
        confirmation_due_date=p.confirmation_due_date, days_late=days_late,
        fallback_partner_id=p.fallback_partner_id,
    )


@router.get("/events/{event_id}/logistics", response_model=list[LogisticsItemOut])
async def get_logistics(
    event_id: str,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    today = now.date()
    ev = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    _get_event_or_404(ev)

    items = list((await session.execute(select(LogisticsItem).where(LogisticsItem.event_id == event_id))).scalars())

    result = []
    for li in items:
        needs_escalation = False
        if li.lock_date and li.status not in ("confirmed", "cancelled"):
            days_to_lock = (li.lock_date - today).days
            needs_escalation = days_to_lock <= li.lead_time_days
        result.append(
            LogisticsItemOut(
                id=li.id, category=li.category, title=li.title,
                status=li.status, lead_time_days=li.lead_time_days,
                lock_date=li.lock_date, needs_escalation=needs_escalation,
            )
        )
    return result


@router.patch("/logistics/{logistics_id}", response_model=LogisticsItemOut)
async def update_logistics(
    logistics_id: str,
    req: LogisticsPatchRequest,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    li_q = select(LogisticsItem).where(LogisticsItem.id == logistics_id)
    li = (await session.execute(li_q)).scalars().first()
    if not li:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Logistics item not found"}})

    from app.db.models.logistics import LOGISTICS_STATUSES
    if req.status not in LOGISTICS_STATUSES:
        raise HTTPException(status_code=422, detail={"error": {"code": "invalid_status", "message": f"Status must be one of {LOGISTICS_STATUSES}"}})

    async with session.begin():
        old_status = li.status
        li.status = req.status
        await audit_service.log(
            session,
            event_id=li.event_id,
            actor_role=role,
            action="logistics_status_changed",
            entity_type="logistics_item",
            entity_id=logistics_id,
            payload={"from": old_status, "to": req.status},
        )

    today = now.date()
    needs_escalation = False
    if li.lock_date and li.status not in ("confirmed", "cancelled"):
        days_to_lock = (li.lock_date - today).days
        needs_escalation = days_to_lock <= li.lead_time_days

    return LogisticsItemOut(
        id=li.id, category=li.category, title=li.title,
        status=li.status, lead_time_days=li.lead_time_days,
        lock_date=li.lock_date, needs_escalation=needs_escalation,
    )


@router.get("/events/{event_id}/content", response_model=list[ContentItemOut])
async def get_content(
    event_id: str,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    today = now.date()
    ev = (await session.execute(select(Event).where(Event.id == event_id))).scalars().first()
    _get_event_or_404(ev)

    items = list((await session.execute(select(ContentItem).where(ContentItem.event_id == event_id).order_by(ContentItem.planned_date))).scalars())

    return [
        ContentItemOut(
            id=ci.id, channel_id=ci.channel_id, type=ci.type,
            planned_date=ci.planned_date, published_at=ci.published_at,
            owner_role=ci.owner_role, title=ci.title,
            is_behind_plan=ci.planned_date <= today and ci.published_at is None,
        )
        for ci in items
    ]


@router.get("/events/{event_id}/outreach", response_model=list[CampaignOut])
async def get_outreach(
    event_id: str,
    session: AsyncSession = Depends(get_session),
):
    channels_q = select(Channel).where(Channel.event_id == event_id)
    channels = list((await session.execute(channels_q)).scalars())

    result = []
    for ch in channels:
        agg_q = select(
            func.sum(ChannelDailyStat.visits).label("v"),
            func.sum(ChannelDailyStat.registrations).label("r"),
        ).where(ChannelDailyStat.channel_id == ch.id)
        row = (await session.execute(agg_q)).first()
        ch_visits = int(row.v or 0)
        ch_regs = int(row.r or 0)
        ch_conv = ch_regs / ch_visits if ch_visits > 0 else 0.0
        result.append(
            CampaignOut(
                channel_id=ch.id, channel_name=ch.name,
                total_visits=ch_visits, total_registrations=ch_regs,
                conversion=round(ch_conv, 4), is_top_converting=ch.is_top_converting,
            )
        )

    result.sort(key=lambda c: -c.conversion)
    return result
