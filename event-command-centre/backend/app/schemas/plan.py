"""Pydantic schemas for plans, workstreams, and milestones."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class WorkstreamOut(BaseModel):
    id: str
    name: str
    owner_role: str


class MilestoneOut(BaseModel):
    id: str
    title: str
    due_date: date
    status: str


class PlanOut(BaseModel):
    id: str
    event_id: str
    generated_at: datetime
    engine_version: str
    rules_applied: list[str]
    workstreams: list[WorkstreamOut]
    milestones: list[MilestoneOut]
    task_count: int


class PlanPreviewOut(BaseModel):
    """Preview output — no rows written to the database."""
    task_count: int
    workstream_names: list[str]
    milestone_count: int
    content_items: int
    rules_applied: list[str]
    warnings: list[str]
