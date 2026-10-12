"""Tasks router — board, update, close, reopen."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth_stub import RoleDep
from app.core.clock import get_clock
from app.core.sse_broker import broker
from app.db.models.event import Event
from app.db.models.task import ChecklistItem, Task
from app.db.session import get_session
from app.schemas.task import (
    ChecklistItemOut,
    ChecklistTickRequest,
    TaskBoardOut,
    TaskCloseRequest,
    TaskCloseResponse,
    TaskOut,
    TaskPatchRequest,
)
from app.services import task_service, snapshot_service, risk_service

router = APIRouter(tags=["tasks"])


def _task_out(task: Task) -> TaskOut:
    return TaskOut(
        id=task.id,
        event_id=task.event_id,
        workstream_id=task.workstream_id,
        title=task.title,
        owner_role=task.owner_role,
        owner_name=task.owner_name,
        due_date=task.due_date,
        status=task.status,
        source_action_id=task.source_action_id,
        success_criterion=task.success_criterion,
        blocked_reason=task.blocked_reason,
        checklist_items=[
            ChecklistItemOut(id=i.id, label=i.label, done=i.done, position=i.position)
            for i in (task.checklist_items or [])
        ],
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("/events/{event_id}/tasks", response_model=TaskBoardOut)
async def get_task_board(
    event_id: str,
    workstream_id: str | None = None,
    owner_role: str | None = None,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
):
    q = (
        select(Task)
        .options(selectinload(Task.checklist_items))
        .where(Task.event_id == event_id)
    )
    if workstream_id:
        q = q.where(Task.workstream_id == workstream_id)
    if owner_role:
        q = q.where(Task.owner_role == owner_role)
    tasks = list((await session.execute(q)).scalars())

    board: dict[str, list[TaskOut]] = {"todo": [], "in_progress": [], "blocked": [], "done": []}
    for task in tasks:
        col = board.get(task.status, board["todo"])
        col.append(_task_out(task))

    return TaskBoardOut(**board)


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: str,
    req: TaskPatchRequest,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
):
    task_q = (
        select(Task)
        .options(selectinload(Task.checklist_items))
        .where(Task.id == task_id)
    )
    task = (await session.execute(task_q)).scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Task not found"}})

    VALID_TRANSITIONS: dict[str, set[str]] = {
        "todo": {"in_progress", "blocked"},
        "in_progress": {"blocked", "done", "todo"},
        "blocked": {"in_progress", "todo"},
        "done": {"in_progress"},  # reopen goes through reopen endpoint
    }

    async with session.begin():
        if req.status and req.status != task.status:
            allowed = VALID_TRANSITIONS.get(task.status, set())
            if req.status not in allowed:
                raise HTTPException(
                    status_code=409,
                    detail={"error": {"code": "invalid_transition", "message": f"Cannot transition from {task.status} to {req.status}"}},
                )
            if req.status == "blocked" and not (req.blocked_reason or task.blocked_reason):
                raise HTTPException(
                    status_code=422,
                    detail={"error": {"code": "validation_error", "message": "blocked_reason is required when status is blocked"}},
                )
            task.status = req.status

        if req.blocked_reason is not None:
            task.blocked_reason = req.blocked_reason
        if req.owner_name is not None:
            task.owner_name = req.owner_name

    return _task_out(task)


@router.patch("/tasks/{task_id}/checklist")
async def tick_checklist(
    task_id: str,
    req: ChecklistTickRequest,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
):
    item_q = select(ChecklistItem).where(
        ChecklistItem.id == req.item_id,
        ChecklistItem.task_id == task_id,
    )
    item = (await session.execute(item_q)).scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Checklist item not found"}})

    async with session.begin():
        item.done = req.done

    return {"id": item.id, "done": item.done}


@router.post("/tasks/{task_id}/close")
async def close_task(
    task_id: str,
    req: TaskCloseRequest,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()

    # Load task to get event_id before the transaction
    task_q = select(Task).where(Task.id == task_id)
    task_pre = (await session.execute(task_q)).scalars().first()
    if not task_pre:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Task not found"}})
    event_id = task_pre.event_id

    # Capture before state
    ev_q = select(Event).where(Event.id == event_id)
    ev = (await session.execute(ev_q)).scalars().first()

    before: dict = {}
    from sqlalchemy import func
    from app.db.models.metric import MetricSnapshot
    if req.metric_key:
        latest_q = (
            select(MetricSnapshot.value)
            .where(MetricSnapshot.event_id == event_id, MetricSnapshot.metric_key == req.metric_key)
            .order_by(MetricSnapshot.recorded_at.desc())
            .limit(1)
        )
        prev = (await session.execute(latest_q)).scalars().first()
        before[req.metric_key] = prev

    try:
        async with session.begin():
            task, closure = await task_service.close_task(
                session,
                task_id=task_id,
                event_id=event_id,
                actor_role=role,
                close_req=req,
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
            risk_specs, new_actions = await risk_service.evaluate_event(
                session,
                event_id=event_id,
                event_type=ev.type,
                snapshot=snapshot,
                actor_role=role,
                now=now,
                days_remaining=days_remaining,
            )
    except ValueError as e:
        msg = str(e)
        if msg.startswith("already_closed:"):
            parts = msg.split(":")
            raise HTTPException(
                status_code=409,
                detail={"error": {"code": "already_closed", "message": f"Task was already closed by {parts[1]} at {parts[2]}"}},
            )
        raise HTTPException(status_code=400, detail={"error": {"code": "bad_request", "message": msg}})

    broker.publish(event_id, "dashboard.updated")
    broker.publish(event_id, "risks.updated")

    after: dict = {}
    if req.metric_key:
        after[req.metric_key] = req.metric_value

    from app.schemas.task import ClosureOut
    return TaskCloseResponse(
        task=_task_out(task),
        closure=ClosureOut(
            id=closure.id,
            task_id=closure.task_id,
            outcome_note=closure.outcome_note,
            metric_key=closure.metric_key,
            metric_value=closure.metric_value,
            closed_by=closure.closed_by,
            closed_at=closure.closed_at,
        ),
        before=before,
        after=after,
        risk_changes=[{"rule_key": r.rule_key, "severity": r.severity} for r in risk_specs],
        new_recommendations=[{"title": a.title, "template_key": a.template_key} for a in new_actions],
    )


@router.post("/tasks/{task_id}/reopen")
async def reopen_task(
    task_id: str,
    role: str = RoleDep,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    task_q = select(Task).where(Task.id == task_id)
    task_pre = (await session.execute(task_q)).scalars().first()
    if not task_pre:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Task not found"}})

    try:
        async with session.begin():
            task = await task_service.reopen_task(
                session,
                task_id=task_id,
                event_id=task_pre.event_id,
                actor_role=role,
                now=now,
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "bad_request", "message": str(e)}})

    broker.publish(task_pre.event_id, "dashboard.updated")
    return {"message": "Task reopened", "task_id": task_id}
