"""Risk engine — pure functions, no database, no I/O.

Each rule is a class implementing evaluate(snapshot, now) -> RiskSpec | None.
Rules are registered in RULES at the bottom of this file.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Protocol

from app.engines.constants import (
    CONTENT_BEHIND_THRESHOLD,
    CONVERSION_THRESHOLD,
    LOGISTICS_LEAD_TIMES,
    PACE_WINDOW_DAYS,
    PARTNER_LATE_CRITICAL_DAYS,
    PARTNER_LATE_HIGH_DAYS,
    PARTNER_LATE_MEDIUM_DAYS,
)


# --------------------------------------------------------------------------- #
# Snapshot dataclasses (plain data, no ORM)
# --------------------------------------------------------------------------- #

@dataclass
class RegistrationSnapshot:
    current: float
    target: int
    days_remaining: int
    recent_daily_values: list[float]  # last PACE_WINDOW_DAYS metric snapshots
    total_visits: float
    form_starts: float


@dataclass
class PartnerSnapshot:
    id: str
    name: str
    status: str
    confirmation_due_date: date | None


@dataclass
class LogisticsSnapshot:
    id: str
    category: str
    title: str
    status: str
    lock_date: date | None


@dataclass
class ContentSnapshot:
    total_planned_to_date: int
    total_published_to_date: int


@dataclass
class OverdueTaskSnapshot:
    workstream_name: str
    owner_role: str
    count: int
    task_ids: list[str]


@dataclass
class EventSnapshot:
    event_id: str
    event_type: str
    registrations: RegistrationSnapshot
    partners: list[PartnerSnapshot]
    logistics: list[LogisticsSnapshot]
    content: ContentSnapshot
    overdue_tasks: list[OverdueTaskSnapshot]


# --------------------------------------------------------------------------- #
# Risk output
# --------------------------------------------------------------------------- #

@dataclass
class RiskSpec:
    rule_key: str
    subject_key: str  # Unique identifier for the subject (global, partner_id, etc.)
    type: str
    severity: str
    owner_role: str
    evidence: dict = field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Rule interface
# --------------------------------------------------------------------------- #

class Rule(Protocol):
    rule_key: str

    def evaluate(self, snapshot: EventSnapshot, now: datetime) -> list[RiskSpec]:
        ...


# --------------------------------------------------------------------------- #
# Rule implementations
# --------------------------------------------------------------------------- #

class RegistrationPaceRule:
    rule_key = "registration_pace_low"

    def evaluate(self, snapshot: EventSnapshot, now: datetime) -> list[RiskSpec]:
        reg = snapshot.registrations
        if reg.days_remaining <= 0:
            return []

        required_pace = (reg.target - reg.current) / reg.days_remaining

        # Compute actual pace from recent metric snapshots
        if len(reg.recent_daily_values) < 2:
            return []

        # Daily differences from the recent window
        diffs = [
            max(0, reg.recent_daily_values[i] - reg.recent_daily_values[i - 1])
            for i in range(1, len(reg.recent_daily_values))
        ]
        current_pace = sum(diffs) / len(diffs) if diffs else 0.0

        if current_pace >= required_pace:
            return []

        gap = reg.target - reg.current
        projected = reg.current + current_pace * reg.days_remaining

        if required_pace > 0:
            pace_ratio = current_pace / required_pace
        else:
            pace_ratio = 1.0

        if pace_ratio < 0.3:
            severity = "critical"
        elif pace_ratio < 0.5:
            severity = "high"
        elif pace_ratio < 0.8:
            severity = "medium"
        else:
            severity = "low"

        return [
            RiskSpec(
                rule_key=self.rule_key,
                subject_key="global",
                type="registration_pace_low",
                severity=severity,
                owner_role="marketing",
                evidence={
                    "current": reg.current,
                    "target": reg.target,
                    "gap": round(gap, 1),
                    "required_pace": round(required_pace, 2),
                    "current_pace": round(current_pace, 2),
                    "pace_window_days": PACE_WINDOW_DAYS,
                    "projected_finish": round(projected, 1),
                    "days_remaining": reg.days_remaining,
                },
            )
        ]


class ConversionRule:
    rule_key = "conversion_low"

    def evaluate(self, snapshot: EventSnapshot, now: datetime) -> list[RiskSpec]:
        reg = snapshot.registrations
        if reg.total_visits <= 0:
            return []

        conversion = reg.registrations_total / reg.total_visits if hasattr(reg, "registrations_total") else (
            reg.current / reg.total_visits
        )

        if conversion >= CONVERSION_THRESHOLD:
            return []

        severity = "high" if conversion < CONVERSION_THRESHOLD * 0.5 else "medium"

        return [
            RiskSpec(
                rule_key=self.rule_key,
                subject_key="global",
                type="conversion_low",
                severity=severity,
                owner_role="marketing",
                evidence={
                    "conversion": round(conversion, 4),
                    "threshold": CONVERSION_THRESHOLD,
                    "total_visits": reg.total_visits,
                    "registrations": reg.current,
                },
            )
        ]


class PartnerConfirmationLateRule:
    rule_key = "partner_confirmation_late"

    def evaluate(self, snapshot: EventSnapshot, now: datetime) -> list[RiskSpec]:
        today = now.date()
        risks: list[RiskSpec] = []
        for partner in snapshot.partners:
            if partner.status in ("confirmed", "activated"):
                continue
            if partner.confirmation_due_date is None:
                continue
            days_late = (today - partner.confirmation_due_date).days
            if days_late <= 0:
                continue

            if days_late >= PARTNER_LATE_CRITICAL_DAYS:
                severity = "critical"
            elif days_late >= PARTNER_LATE_HIGH_DAYS:
                severity = "high"
            elif days_late >= PARTNER_LATE_MEDIUM_DAYS:
                severity = "medium"
            else:
                severity = "low"

            risks.append(
                RiskSpec(
                    rule_key=self.rule_key,
                    subject_key=partner.id,
                    type="partner_confirmation_late",
                    severity=severity,
                    owner_role="partnerships",
                    evidence={
                        "partner_id": partner.id,
                        "partner_name": partner.name,
                        "due_date": partner.confirmation_due_date.isoformat(),
                        "days_late": days_late,
                        "current_status": partner.status,
                    },
                )
            )
        return risks


class LogisticsUnconfirmedRule:
    rule_key = "logistics_unconfirmed"

    def evaluate(self, snapshot: EventSnapshot, now: datetime) -> list[RiskSpec]:
        today = now.date()
        risks: list[RiskSpec] = []
        for item in snapshot.logistics:
            if item.status in ("confirmed", "cancelled"):
                continue
            if item.lock_date is None:
                continue
            days_to_lock = (item.lock_date - today).days
            if days_to_lock > LOGISTICS_LEAD_TIMES.get(item.category, 21):
                continue  # still within safe window

            if days_to_lock < 0:
                severity = "critical"
            elif days_to_lock <= 3:
                severity = "high"
            elif days_to_lock <= 7:
                severity = "medium"
            else:
                severity = "low"

            risks.append(
                RiskSpec(
                    rule_key=self.rule_key,
                    subject_key=item.id,
                    type="logistics_unconfirmed",
                    severity=severity,
                    owner_role="operations",
                    evidence={
                        "logistics_id": item.id,
                        "category": item.category,
                        "title": item.title,
                        "lock_date": item.lock_date.isoformat(),
                        "days_to_lock": days_to_lock,
                        "status": item.status,
                    },
                )
            )
        return risks


class ContentBehindPlanRule:
    rule_key = "content_behind_plan"

    def evaluate(self, snapshot: EventSnapshot, now: datetime) -> list[RiskSpec]:
        behind = snapshot.content.total_planned_to_date - snapshot.content.total_published_to_date
        if behind <= CONTENT_BEHIND_THRESHOLD:
            return []

        severity = "high" if behind >= CONTENT_BEHIND_THRESHOLD * 3 else "medium"

        return [
            RiskSpec(
                rule_key=self.rule_key,
                subject_key="global",
                type="content_behind_plan",
                severity=severity,
                owner_role="marketing",
                evidence={
                    "planned_to_date": snapshot.content.total_planned_to_date,
                    "published_to_date": snapshot.content.total_published_to_date,
                    "behind_count": behind,
                    "threshold": CONTENT_BEHIND_THRESHOLD,
                },
            )
        ]


class OverdueTasksRule:
    rule_key = "tasks_overdue"

    def evaluate(self, snapshot: EventSnapshot, now: datetime) -> list[RiskSpec]:
        risks: list[RiskSpec] = []
        for group in snapshot.overdue_tasks:
            if group.count == 0:
                continue
            severity = "high" if group.count >= 3 else "medium"
            risks.append(
                RiskSpec(
                    rule_key=self.rule_key,
                    subject_key=f"{group.owner_role}_{group.workstream_name}",
                    type="tasks_overdue",
                    severity=severity,
                    owner_role=group.owner_role,
                    evidence={
                        "workstream": group.workstream_name,
                        "owner_role": group.owner_role,
                        "count": group.count,
                        "task_ids": group.task_ids,
                    },
                )
            )
        return risks


# --------------------------------------------------------------------------- #
# Rule registry
# --------------------------------------------------------------------------- #

RULES: list[Rule] = [
    RegistrationPaceRule(),
    ConversionRule(),
    PartnerConfirmationLateRule(),
    LogisticsUnconfirmedRule(),
    ContentBehindPlanRule(),
    OverdueTasksRule(),
]


def evaluate_all(snapshot: EventSnapshot, now: datetime) -> list[RiskSpec]:
    """Run every rule and return the combined list of detected risks."""
    results: list[RiskSpec] = []
    for rule in RULES:
        try:
            results.extend(rule.evaluate(snapshot, now))
        except Exception as exc:  # noqa: BLE001
            # Rules must never crash the evaluation pipeline
            import logging
            logging.getLogger(__name__).warning("Rule %s failed: %s", rule.rule_key, exc)
    return results
