"""Task service — accept action, update task, close and reopen."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.closure import Closure
from app.db.models.metric import MetricSnapshot
from app.db.models.risk import Action
from app.db.models.task import ChecklistItem, Task
from app.schemas.task import TaskCloseRequest
from app.services import audit_service


async def accept_action(
    session: AsyncSession,
    *,
    action_id: str,
    event_id: str,
    actor_role: str,
    owner_name: str | None,
    now: datetime,
) -> Task:
    """Create a task from an action in one transaction. Idempotent by action_id."""
    # Check if task already exists for this action
    existing_q = select(Task).where(Task.source_action_id == action_id)
    existing = (await session.execute(existing_q)).scalars().first()
    if existing:
        return existing

    action_q = select(Action).where(Action.id == action_id, Action.event_id == event_id)
    action = (await session.execute(action_q)).scalars().first()
    if not action:
        raise ValueError(f"Action {action_id} not found")

    task = Task(
        event_id=event_id,
        title=action.title,
        owner_role=action.owner_role,
        owner_name=owner_name,
        status="in_progress",
        source_action_id=action.id,
        success_criterion=action.rationale,
    )
    session.add(task)
    action.status = "accepted"
    await session.flush()

    # Create checklist items
    for i, label in enumerate(action.checklist_template):
        item = ChecklistItem(task_id=task.id, label=label, position=i)
        session.add(item)

    await audit_service.log(
        session,
        event_id=event_id,
        actor_role=actor_role,
        action="action_accepted",
        entity_type="task",
        entity_id=task.id,
        payload={"action_id": action_id, "title": task.title},
    )

    return task


async def close_task(
    session: AsyncSession,
    *,
    task_id: str,
    event_id: str,
    actor_role: str,
    close_req: TaskCloseRequest,
    now: datetime,
) -> tuple[Task, Closure]:
    """Close a task in one transaction. Returns 409-like ValueError if already closed."""
    # Lock the event row
    from app.db.models.event import Event
    event_q = select(Event).where(Event.id == event_id).with_for_update()
    event = (await session.execute(event_q)).scalars().first()
    if not event:
        raise ValueError(f"Event {event_id} not found")

    task_q = (
        select(Task)
        .options(selectinload(Task.closure))
        .where(Task.id == task_id, Task.event_id == event_id)
    )
    task = (await session.execute(task_q)).scalars().first()
    if not task:
        raise ValueError(f"Task {task_id} not found")

    if task.closure:
        raise ValueError(f"already_closed:{task.closure.closed_by}:{task.closure.closed_at.isoformat()}")

    closure = Closure(
        task_id=task.id,
        outcome_note=close_req.outcome_note,
        metric_key=close_req.metric_key,
        metric_value=close_req.metric_value,
        closed_by=actor_role,
    )
    session.add(closure)
    task.status = "done"

    # Record metric snapshot if provided
    if close_req.metric_key and close_req.metric_value is not None:
        snapshot = MetricSnapshot(
            event_id=event_id,
            metric_key=close_req.metric_key,
            value=close_req.metric_value,
            source="closure",
        )
        session.add(snapshot)

    await audit_service.log(
        session,
        event_id=event_id,
        actor_role=actor_role,
        action="task_closed",
        entity_type="task",
        entity_id=task_id,
        payload={
            "outcome_note": close_req.outcome_note[:200],
            "metric_key": close_req.metric_key,
            "metric_value": close_req.metric_value,
        },
    )

    return task, closure


async def reopen_task(
    session: AsyncSession,
    *,
    task_id: str,
    event_id: str,
    actor_role: str,
    now: datetime,
) -> Task:
    """Reopen a closed task — removes the closure record."""
    task_q = (
        select(Task)
        .options(selectinload(Task.closure))
        .where(Task.id == task_id, Task.event_id == event_id)
    )
    task = (await session.execute(task_q)).scalars().first()
    if not task:
        raise ValueError(f"Task {task_id} not found")
    if not task.closure:
        raise ValueError("Task is not closed")

    closure = task.closure
    await session.delete(closure)
    task.status = "in_progress"

    await audit_service.log(
        session,
        event_id=event_id,
        actor_role=actor_role,
        action="task_reopened",
        entity_type="task",
        entity_id=task_id,
        payload={},
    )

    return task
