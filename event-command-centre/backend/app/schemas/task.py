"""Pydantic schemas for tasks and closures."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class ChecklistItemOut(BaseModel):
    id: str
    label: str
    done: bool
    position: int


class TaskOut(BaseModel):
    id: str
    event_id: str
    workstream_id: str | None
    title: str
    owner_role: str
    owner_name: str | None
    due_date: date | None
    status: str
    source_action_id: str | None
    success_criterion: str | None
    blocked_reason: str | None
    checklist_items: list[ChecklistItemOut]
    created_at: datetime
    updated_at: datetime


class TaskPatchRequest(BaseModel):
    status: str | None = None
    blocked_reason: str | None = None
    owner_name: str | None = None


class ChecklistTickRequest(BaseModel):
    item_id: str
    done: bool


class TaskCloseRequest(BaseModel):
    outcome_note: str = Field(min_length=1, max_length=2000)
    metric_key: str | None = None
    metric_value: float | None = None


class ClosureOut(BaseModel):
    id: str
    task_id: str
    outcome_note: str
    metric_key: str | None
    metric_value: float | None
    closed_by: str
    closed_at: datetime


class TaskCloseResponse(BaseModel):
    task: TaskOut
    closure: ClosureOut
    before: dict
    after: dict
    risk_changes: list[dict]
    new_recommendations: list[dict]


class TaskBoardOut(BaseModel):
    todo: list[TaskOut]
    in_progress: list[TaskOut]
    blocked: list[TaskOut]
    done: list[TaskOut]
