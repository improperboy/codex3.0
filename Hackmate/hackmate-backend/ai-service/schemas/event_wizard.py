from typing import List, Optional
from pydantic import BaseModel


class EventWizardInput(BaseModel):
    event_format: str
    event_date: str
    expected_participants: int
    venue: str
    budget: str
    goals: str
    audience: str
    duration_days: int = 2
    theme: Optional[str] = None


class Milestone(BaseModel):
    name: str
    date_offset_days: int
    description: str
    responsible_team: str


class StaffRole(BaseModel):
    role: str
    count: int
    responsibilities: str


class MarketingChannel(BaseModel):
    channel: str
    target: str
    deadline_offset_days: int


class BudgetItem(BaseModel):
    category: str
    estimated_amount: str
    percentage: Optional[float] = None


class Risk(BaseModel):
    risk: str
    mitigation: str


class EventPlan(BaseModel):
    overview: str
    timeline: List[Milestone]
    staffing: List[StaffRole]
    marketing: List[MarketingChannel]
    budget_breakdown: List[BudgetItem]
    key_risks: List[Risk]
    success_metrics: List[str]
