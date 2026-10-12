"""Event service — create event and plan in one transaction."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.channel import Channel
from app.db.models.content import ContentItem
from app.db.models.event import Event
from app.db.models.logistics import LogisticsItem
from app.db.models.plan import Milestone, Plan, Workstream
from app.db.models.task import Task
from app.engines.plan_engine import PlanSpec, create_plan
from app.schemas.brief import Brief
from app.services import audit_service


async def create_event(
    session: AsyncSession,
    *,
    brief: Brief,
    actor_role: str,
    now: datetime,
) -> tuple[Event, Plan, int]:
    """Create an event and its plan in one transaction.

    Returns (event, plan, task_count). Caller must commit.
    """
    # 1. Create event
    event = Event(
        name=brief.name,
        type=brief.type,
        format=brief.format,
        start_date=brief.start_date,
        end_date=brief.end_date,
        audience=brief.audience,
        scale_seats=brief.scale_seats,
        venue_type=brief.venue_type,
        city=brief.city,
        objectives=brief.objectives,
        target_registrations=brief.target_registrations,
        target_reach=brief.target_reach,
        target_partners=brief.target_partners,
        brief=brief.model_dump(mode="json"),
    )
    session.add(event)
    await session.flush()  # get event.id

    # 2. Generate plan
    plan_spec: PlanSpec = create_plan(brief, now)

    # 3. Persist plan
    plan = Plan(
        event_id=event.id,
        rules_applied=plan_spec.rules_applied,
        engine_version=plan_spec.engine_version,
    )
    session.add(plan)
    await session.flush()

    # 4. Workstreams
    ws_by_name: dict[str, Workstream] = {}
    for ws_spec in plan_spec.workstreams:
        ws = Workstream(
            plan_id=plan.id,
            name=ws_spec.name,
            owner_role=ws_spec.owner_role,
        )
        session.add(ws)
        ws_by_name[ws_spec.name] = ws
    await session.flush()

    # 5. Tasks
    task_count = 0
    for task_spec in plan_spec.tasks:
        ws = ws_by_name.get(task_spec.workstream_name)
        task = Task(
            event_id=event.id,
            workstream_id=ws.id if ws else None,
            title=task_spec.title,
            owner_role=task_spec.owner_role,
            due_date=task_spec.due_date,
            success_criterion=task_spec.success_criterion,
        )
        session.add(task)
        task_count += 1

    # 6. Milestones
    for ms_spec in plan_spec.milestones:
        ms = Milestone(
            plan_id=plan.id,
            title=ms_spec.title,
            due_date=ms_spec.due_date,
        )
        session.add(ms)

    # 7. Channels (default channels)
    from app.engines.constants import CONTENT_CHANNELS_DEFAULT
    channel_objs: dict[str, Channel] = {}
    for ch_name in CONTENT_CHANNELS_DEFAULT:
        ch = Channel(
            event_id=event.id,
            name=ch_name,
            is_campus="Campus" in ch_name,
        )
        session.add(ch)
        channel_objs[ch_name] = ch
    await session.flush()

    # 8. Content items
    for ci_spec in plan_spec.content_items:
        ch = channel_objs.get(ci_spec.channel)
        ci = ContentItem(
            event_id=event.id,
            channel_id=ch.id if ch else None,
            type=ci_spec.type,
            planned_date=ci_spec.planned_date,
            owner_role=ci_spec.owner_role,
        )
        session.add(ci)

    # 9. Logistics items
    for li_spec in plan_spec.logistics_items:
        li = LogisticsItem(
            event_id=event.id,
            category=li_spec.category,
            title=li_spec.title,
            lead_time_days=li_spec.lead_time_days,
            lock_date=li_spec.lock_date,
        )
        session.add(li)

    # 10. Audit entry
    await audit_service.log(
        session,
        event_id=event.id,
        actor_role=actor_role,
        action="event_created",
        entity_type="event",
        entity_id=event.id,
        payload={"name": event.name, "type": event.type, "task_count": task_count},
    )

    return event, plan, task_count
