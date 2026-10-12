"""Recommendations router — list, accept, dismiss, snooze, restore."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_stub import RoleDep
from app.core.clock import get_clock
from app.core.sse_broker import broker
from app.db.models.event import Event
from app.db.models.risk import Action
from app.db.session import get_session
from app.schemas.risk import (
    AcceptRequest,
    ActionOut,
    DismissRequest,
    RecommendationListOut,
    SnoozeRequest,
)
from app.services import task_service

router = APIRouter(tags=["recommendations"])


def _action_out(a: Action) -> ActionOut:
    return ActionOut(
        id=a.id,
        template_key=a.template_key,
        title=a.title,
        rationale=a.rationale,
        owner_role=a.owner_role,
        expected_impact=a.expected_impact,
        effort=a.effort,
        urgency=a.urgency,
        status=a.status,
        risk_id=a.risk_id,
        checklist_template=a.checklist_template,
        snoozed_until=a.snoozed_until,
    )


@router.get("/events/{event_id}/recommendations", response_model=RecommendationListOut)
async def list_recommendations(
    event_id: str,
    role: str | None = None,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    q = select(Action).where(
        Action.event_id == event_id,
        Action.status == "suggested",
    )
    if role:
        q = q.where(Action.owner_role == role)
    # Filter out snoozed actions that haven't woken up yet
    q = q.where(
        (Action.snoozed_until.is_(None)) | (Action.snoozed_until <= now)
    )
    q = q.order_by(Action.urgency.desc())
    actions = list((await session.execute(q)).scalars())

    from app.db.models.risk import Risk
    last_risk_q = select(Risk).where(Risk.event_id == event_id, Risk.resolved_at.is_(None)).order_by(Risk.detected_at.desc()).limit(1)
    last_risk = (await session.execute(last_risk_q)).scalars().first()
    evaluated_at = last_risk.detected_at if last_risk else None

    return RecommendationListOut(
        recommendations=[_action_out(a) for a in actions],
        evaluated_at=evaluated_at,
    )


@router.post("/recommendations/{action_id}/accept", status_code=status.HTTP_201_CREATED)
async def accept_recommendation(
    action_id: str,
    req: AcceptRequest,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    action_q = select(Action).where(Action.id == action_id)
    action = (await session.execute(action_q)).scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Action not found"}})

    async with session.begin():
        task = await task_service.accept_action(
            session,
            action_id=action_id,
            event_id=action.event_id,
            actor_role=role,
            owner_name=req.owner_name,
            now=now,
        )

    broker.publish(action.event_id, "dashboard.updated")

    from app.schemas.task import ChecklistItemOut, TaskOut
    items = [ChecklistItemOut(id=i.id, label=i.label, done=i.done, position=i.position) for i in task.checklist_items]
    return {
        "task_id": task.id,
        "title": task.title,
        "checklist_item_count": len(items),
    }


@router.post("/recommendations/{action_id}/dismiss")
async def dismiss_recommendation(
    action_id: str,
    req: DismissRequest,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
):
    action_q = select(Action).where(Action.id == action_id)
    action = (await session.execute(action_q)).scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Action not found"}})
    if not req.reason or not req.reason.strip():
        raise HTTPException(status_code=422, detail={"error": {"code": "validation_error", "message": "Dismiss reason is required"}})

    async with session.begin():
        action.status = "dismissed"
        action.dismiss_reason = req.reason

        from app.services import audit_service
        await audit_service.log(
            session,
            event_id=action.event_id,
            actor_role=role,
            action="recommendation_dismissed",
            entity_type="action",
            entity_id=action_id,
            payload={"reason": req.reason[:500]},
        )

    return {"message": "Recommendation dismissed"}


@router.post("/recommendations/{action_id}/snooze")
async def snooze_recommendation(
    action_id: str,
    req: SnoozeRequest,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    action_q = select(Action).where(Action.id == action_id)
    action = (await session.execute(action_q)).scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Action not found"}})

    async with session.begin():
        action.snoozed_until = now + timedelta(days=req.days)
        action.status = "snoozed"

        from app.services import audit_service
        await audit_service.log(
            session,
            event_id=action.event_id,
            actor_role=role,
            action="recommendation_snoozed",
            entity_type="action",
            entity_id=action_id,
            payload={"days": req.days, "until": action.snoozed_until.isoformat()},
        )

    return {"snoozed_until": action.snoozed_until.isoformat()}


@router.post("/recommendations/{action_id}/restore")
async def restore_recommendation(
    action_id: str,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
):
    action_q = select(Action).where(Action.id == action_id)
    action = (await session.execute(action_q)).scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Action not found"}})

    async with session.begin():
        action.status = "suggested"
        action.dismiss_reason = None
        action.snoozed_until = None

        from app.services import audit_service
        await audit_service.log(
            session,
            event_id=action.event_id,
            actor_role=role,
            action="recommendation_restored",
            entity_type="action",
            entity_id=action_id,
            payload={},
        )

    return {"message": "Recommendation restored"}
