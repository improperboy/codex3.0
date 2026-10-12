"""Plans router — GET plan, POST preview."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.clock import get_clock
from app.db.models.event import Event
from app.db.models.plan import Milestone, Plan, Workstream
from app.db.models.task import Task
from app.db.session import get_session
from app.engines.plan_engine import plan_preview
from app.schemas.brief import Brief
from app.schemas.plan import MilestoneOut, PlanOut, PlanPreviewOut, WorkstreamOut

router = APIRouter(tags=["plans"])


@router.get("/events/{event_id}/plan", response_model=PlanOut)
async def get_plan(
    event_id: str,
    session: AsyncSession = Depends(get_session),
):
    plan_q = (
        select(Plan)
        .options(selectinload(Plan.workstreams), selectinload(Plan.milestones))
        .where(Plan.event_id == event_id, Plan.is_current == True)  # noqa: E712
    )
    plan = (await session.execute(plan_q)).scalars().first()
    if not plan:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "Plan not found for this event"}},
        )

    task_count_q = select(Task).where(Task.event_id == event_id)
    task_count = len(list((await session.execute(task_count_q)).scalars()))

    return PlanOut(
        id=plan.id,
        event_id=event_id,
        generated_at=plan.generated_at,
        engine_version=plan.engine_version,
        rules_applied=plan.rules_applied,
        workstreams=[WorkstreamOut(id=ws.id, name=ws.name, owner_role=ws.owner_role) for ws in plan.workstreams],
        milestones=[MilestoneOut(id=ms.id, title=ms.title, due_date=ms.due_date, status=ms.status) for ms in plan.milestones],
        task_count=task_count,
    )


@router.post("/plans/preview", response_model=PlanPreviewOut)
async def preview_plan(
    brief: Brief,
    clock=Depends(get_clock),
):
    """Return plan preview without writing to the database."""
    now: datetime = clock()
    result = plan_preview(brief, now)
    return PlanPreviewOut(**result)
