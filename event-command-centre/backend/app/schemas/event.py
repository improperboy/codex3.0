"""Pydantic schemas for events."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.plan import PlanOut


class EventOut(BaseModel):
    id: str
    name: str
    type: str
    format: str
    start_date: date
    end_date: date
    audience: str
    scale_seats: int
    venue_type: str | None
    city: str | None
    objectives: list[str]
    target_registrations: int
    target_reach: int | None
    target_partners: int | None
    created_at: datetime


class EventWithPlanOut(EventOut):
    plan: PlanOut | None = None


class EventCreatedOut(BaseModel):
    id: str
    name: str
    plan_id: str
    task_count: int
    message: str = "Event and plan created successfully"
