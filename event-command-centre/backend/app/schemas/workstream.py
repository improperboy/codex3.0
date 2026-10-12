"""Pydantic schemas for workstream detail endpoints."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


# --- Registrations ---

class FunnelOut(BaseModel):
    visits: float
    form_starts: float
    registrations: float
    confirmed_attendees: float
    visit_to_registration: float


class ChannelStatOut(BaseModel):
    channel_id: str
    name: str
    visits: int
    registrations: int
    conversion: float
    is_campus: bool
    is_top_converting: bool


class GapPanelOut(BaseModel):
    target: int
    actual: float
    required_pace: float
    current_pace: float
    projected_finish: float
    days_remaining: int


class RegistrationsOut(BaseModel):
    funnel: FunnelOut
    gap: GapPanelOut
    channels: list[ChannelStatOut]


# --- Partners ---

class PartnerOut(BaseModel):
    id: str
    name: str
    tier: str
    status: str
    confirmation_due_date: date | None
    days_late: int | None
    fallback_partner_id: str | None


class PartnerPatchRequest(BaseModel):
    status: str


# --- Logistics ---

class LogisticsItemOut(BaseModel):
    id: str
    category: str
    title: str
    status: str
    lead_time_days: int
    lock_date: date | None
    needs_escalation: bool


class LogisticsPatchRequest(BaseModel):
    status: str


# --- Content ---

class ContentItemOut(BaseModel):
    id: str
    channel_id: str | None
    type: str
    planned_date: date
    published_at: datetime | None
    owner_role: str
    title: str | None
    is_behind_plan: bool


# --- Outreach ---

class CampaignOut(BaseModel):
    channel_id: str
    channel_name: str
    total_visits: int
    total_registrations: int
    conversion: float
    is_top_converting: bool
