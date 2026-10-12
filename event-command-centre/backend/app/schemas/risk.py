"""Pydantic schemas for risks and actions."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class RiskOut(BaseModel):
    id: str
    rule_key: str
    type: str
    severity: str
    owner_role: str
    evidence: dict
    detected_at: datetime
    resolved_at: datetime | None
    resolution_note: str | None


class ActionOut(BaseModel):
    id: str
    template_key: str
    title: str
    rationale: str
    owner_role: str
    expected_impact: str
    effort: str
    urgency: float
    status: str
    risk_id: str | None
    checklist_template: list
    snoozed_until: datetime | None


class RiskListOut(BaseModel):
    risks: list[RiskOut]
    evaluated_at: datetime | None


class RecommendationListOut(BaseModel):
    recommendations: list[ActionOut]
    evaluated_at: datetime | None


class DismissRequest(BaseModel):
    reason: str


class SnoozeRequest(BaseModel):
    days: int


class AcceptRequest(BaseModel):
    owner_name: str | None = None
