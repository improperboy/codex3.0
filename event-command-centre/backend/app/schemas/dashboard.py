"""Pydantic schemas for the command dashboard."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class KpiOut(BaseModel):
    value: float | None
    target: float | None
    pace: float | None = None  # per day
    required_pace: float | None = None


class WorkstreamSummaryOut(BaseModel):
    workstream_id: str
    name: str
    owner_role: str
    total_tasks: int
    done_tasks: int
    overdue_tasks: int
    next_milestone_title: str | None
    next_milestone_date: str | None


class RiskSummaryOut(BaseModel):
    id: str
    type: str
    severity: str
    owner_role: str
    evidence_summary: str


class ActionSummaryOut(BaseModel):
    id: str
    title: str
    owner_role: str
    expected_impact: str
    effort: str
    urgency: float
    rationale: str


class DashboardOut(BaseModel):
    event_id: str
    health_label: str  # on_track | at_risk | off_track
    days_remaining: int | None
    registrations: KpiOut
    reach: KpiOut
    partners: KpiOut
    open_tasks: int
    overdue_tasks: int
    content_published: KpiOut
    top_risks: list[RiskSummaryOut]
    top_recommendations: list[ActionSummaryOut]
    workstreams: list[WorkstreamSummaryOut]
    evaluated_at: datetime | None


class MetricRecordRequest(BaseModel):
    metric_key: str
    value: float
    source: str = "manual"
