"""Demo router — seed and reset endpoints (DEMO_ENABLED only)."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_stub import RoleDep
from app.core.clock import get_clock
from app.core.config import settings
from app.core.sse_broker import broker
from app.db.models.closure import Closure
from app.db.models.event import Event
from app.db.models.metric import MetricSnapshot
from app.db.models.risk import Action
from app.db.session import get_session
from app.services import event_service, risk_service, snapshot_service

router = APIRouter(tags=["demo"])


def _check_demo_enabled():
    if not settings.DEMO_ENABLED:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Not found"}})


class ResetRequest(BaseModel):
    confirm: str  # must equal the event id


@router.post("/demo/seed")
async def seed_demo(
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    """Create the Hackingly Build Sprint demo event with seeded gaps."""
    _check_demo_enabled()
    now: datetime = clock()

    from app.seed.demo_event import build_demo_brief, seed_demo_state
    brief = build_demo_brief(now)

    async with session.begin():
        ev, plan, task_count = await event_service.create_event(
            session, brief=brief, actor_role=role, now=now
        )
        await session.flush()
        await seed_demo_state(session, event_id=ev.id, now=now)

        # Run initial risk evaluation
        days_remaining = (ev.start_date - now.date()).days
        snapshot = await snapshot_service.build_snapshot(
            session,
            event_id=ev.id,
            event_type=ev.type,
            target_registrations=ev.target_registrations,
            days_remaining=days_remaining,
            now=now,
        )
        await risk_service.evaluate_event(
            session,
            event_id=ev.id,
            event_type=ev.type,
            snapshot=snapshot,
            actor_role=role,
            now=now,
            days_remaining=days_remaining,
        )

    return {
        "event_id": ev.id,
        "name": ev.name,
        "task_count": task_count,
        "message": "Demo event seeded successfully",
    }


@router.post("/demo/reset")
async def reset_demo(
    req: ResetRequest,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    """Reset a demo event back to the seeded state."""
    _check_demo_enabled()
    now: datetime = clock()
    event_id = req.confirm

    ev_q = select(Event).where(Event.id == event_id)
    ev = (await session.execute(ev_q)).scalars().first()
    if not ev:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Event not found"}})

    async with session.begin():
        # Remove closures, accepted/dismissed actions, and metric snapshots
        tasks_with_closures_q = select(Closure).join(
            "task"
        ).where(__import__("app.db.models.task", fromlist=["Task"]).Task.event_id == event_id)
        
        # Simpler: delete all closures for this event's tasks
        from app.db.models.task import Task
        task_ids_q = select(Task.id).where(Task.event_id == event_id)
        task_ids = list((await session.execute(task_ids_q)).scalars())
        if task_ids:
            await session.execute(delete(Closure).where(Closure.task_id.in_(task_ids)))

        # Reset task statuses (only tasks from accepted actions)
        await session.execute(
            __import__("sqlalchemy", fromlist=["update"]).update(Task)
            .where(Task.event_id == event_id, Task.source_action_id.isnot(None))
            .values(status="todo")
        )

        # Remove suggested actions (will be regenerated)
        await session.execute(delete(Action).where(Action.event_id == event_id))

        # Remove metric snapshots added after seed
        from app.db.models.metric import MetricSnapshot
        await session.execute(delete(MetricSnapshot).where(
            MetricSnapshot.event_id == event_id,
            MetricSnapshot.source != "seed",
        ))

        # Re-seed metrics
        from app.seed.demo_event import seed_demo_state
        await seed_demo_state(session, event_id=event_id, now=now)

        # Re-run risk evaluation
        days_remaining = (ev.start_date - now.date()).days
        snapshot = await snapshot_service.build_snapshot(
            session,
            event_id=ev.id,
            event_type=ev.type,
            target_registrations=ev.target_registrations,
            days_remaining=days_remaining,
            now=now,
        )
        await risk_service.evaluate_event(
            session,
            event_id=ev.id,
            event_type=ev.type,
            snapshot=snapshot,
            actor_role=role,
            now=now,
            days_remaining=days_remaining,
        )

        from app.services import audit_service
        await audit_service.log(
            session,
            event_id=event_id,
            actor_role=role,
            action="demo_reset",
            entity_type="event",
            entity_id=event_id,
            payload={"reset_at": now.isoformat()},
        )

    broker.publish(event_id, "dashboard.updated")
    broker.publish(event_id, "risks.updated")

    return {"message": "Demo reset successfully", "event_id": event_id}
