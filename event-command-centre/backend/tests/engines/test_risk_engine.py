"""Unit tests for risk engine rules — no database required."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import pytest

from app.engines.risk_engine import (
    ContentSnapshot,
    EventSnapshot,
    LogisticsSnapshot,
    OverdueTaskSnapshot,
    PartnerSnapshot,
    RegistrationSnapshot,
    evaluate_all,
    ConversionRule,
    ContentBehindPlanRule,
    LogisticsUnconfirmedRule,
    OverdueTasksRule,
    PartnerConfirmationLateRule,
    RegistrationPaceRule,
)


def _now() -> datetime:
    return datetime(2026, 10, 12, 10, 0, 0, tzinfo=timezone.utc)


def _base_snapshot(**kwargs) -> EventSnapshot:
    defaults = dict(
        event_id="evt-1",
        event_type="hackathon",
        registrations=RegistrationSnapshot(
            current=140.0,
            target=300,
            days_remaining=45,
            recent_daily_values=[92, 94, 96, 97, 98, 99, 100, 102, 103, 104, 106, 107, 108, 110, 111, 140],
            total_visits=2295.0,
            form_starts=500.0,
        ),
        partners=[],
        logistics=[],
        content=ContentSnapshot(total_planned_to_date=10, total_published_to_date=10),
        overdue_tasks=[],
    )
    defaults.update(kwargs)
    return EventSnapshot(**defaults)


class TestRegistrationPaceRule:
    rule = RegistrationPaceRule()

    def test_no_risk_at_required_pace(self):
        snap = _base_snapshot()
        # 140 reg, 300 target, 45 days → required = (300-140)/45 ≈ 3.56
        # Build recent values with exactly required pace
        required = (300 - 140) / 45
        values = [140 - required * i for i in range(15, -1, -1)]
        snap.registrations.recent_daily_values = values
        risks = self.rule.evaluate(snap, _now())
        assert risks == []

    def test_risk_below_required_pace(self):
        snap = _base_snapshot()
        # Slow pace: 1.6/day
        values = [92 + 1.6 * i for i in range(16)]
        snap.registrations.recent_daily_values = values
        risks = self.rule.evaluate(snap, _now())
        assert len(risks) == 1
        assert risks[0].rule_key == "registration_pace_low"
        assert risks[0].severity in ("low", "medium", "high", "critical")

    def test_critical_severity_at_very_low_pace(self):
        snap = _base_snapshot()
        # Barely moving: 0.5/day
        values = [100 + 0.5 * i for i in range(16)]
        snap.registrations.recent_daily_values = values
        risks = self.rule.evaluate(snap, _now())
        assert risks[0].severity in ("high", "critical")

    def test_no_risk_with_no_days_remaining(self):
        snap = _base_snapshot()
        snap.registrations.days_remaining = 0
        risks = self.rule.evaluate(snap, _now())
        assert risks == []

    def test_evidence_contains_required_fields(self):
        snap = _base_snapshot()
        values = [92 + 1.6 * i for i in range(16)]
        snap.registrations.recent_daily_values = values
        risks = self.rule.evaluate(snap, _now())
        ev = risks[0].evidence
        assert "current_pace" in ev
        assert "required_pace" in ev
        assert "projected_finish" in ev


class TestConversionRule:
    rule = ConversionRule()

    def test_no_risk_above_threshold(self):
        snap = _base_snapshot()
        snap.registrations.current = 200.0
        snap.registrations.total_visits = 200 / 0.09 - 1  # just above 9%
        snap.registrations.total_visits = 1800  # 200/1800 ≈ 11%
        risks = self.rule.evaluate(snap, _now())
        assert risks == []

    def test_risk_below_threshold(self):
        snap = _base_snapshot()
        # 140 / 2295 = 6.1%
        risks = self.rule.evaluate(snap, _now())
        assert len(risks) == 1
        assert risks[0].rule_key == "conversion_low"

    def test_no_risk_when_no_visits(self):
        snap = _base_snapshot()
        snap.registrations.total_visits = 0
        risks = self.rule.evaluate(snap, _now())
        assert risks == []


class TestPartnerConfirmationLateRule:
    rule = PartnerConfirmationLateRule()
    today = _now().date()

    def test_no_risk_for_confirmed_partner(self):
        snap = _base_snapshot(
            partners=[PartnerSnapshot("p1", "CorpX", "confirmed", self.today - timedelta(days=6))]
        )
        risks = self.rule.evaluate(snap, _now())
        assert risks == []

    def test_risk_for_late_contacted_partner(self):
        snap = _base_snapshot(
            partners=[PartnerSnapshot("p1", "CorpX", "contacted", self.today - timedelta(days=6))]
        )
        risks = self.rule.evaluate(snap, _now())
        assert len(risks) == 1
        assert risks[0].rule_key == "partner_confirmation_late"
        assert risks[0].evidence["days_late"] == 6

    def test_severity_increases_with_days_late(self):
        def get_sev(days: int) -> str:
            snap = _base_snapshot(
                partners=[PartnerSnapshot("p1", "X", "contacted", self.today - timedelta(days=days))]
            )
            return self.rule.evaluate(snap, _now())[0].severity

        assert get_sev(2) == "low"
        assert get_sev(5) == "medium"
        assert get_sev(9) == "high"
        assert get_sev(15) == "critical"

    def test_not_late_if_due_date_in_future(self):
        snap = _base_snapshot(
            partners=[PartnerSnapshot("p1", "X", "contacted", self.today + timedelta(days=3))]
        )
        risks = self.rule.evaluate(snap, _now())
        assert risks == []


class TestLogisticsUnconfirmedRule:
    rule = LogisticsUnconfirmedRule()
    today = _now().date()

    def test_no_risk_for_confirmed_item(self):
        snap = _base_snapshot(
            logistics=[LogisticsSnapshot("l1", "catering", "Catering", "confirmed", self.today + timedelta(days=5))]
        )
        risks = self.rule.evaluate(snap, _now())
        assert risks == []

    def test_risk_inside_lock_window(self):
        snap = _base_snapshot(
            logistics=[LogisticsSnapshot("l1", "catering", "Catering", "pending", self.today + timedelta(days=10))]
        )
        risks = self.rule.evaluate(snap, _now())
        assert len(risks) == 1
        assert risks[0].rule_key == "logistics_unconfirmed"

    def test_critical_when_past_lock_date(self):
        snap = _base_snapshot(
            logistics=[LogisticsSnapshot("l1", "catering", "Catering", "pending", self.today - timedelta(days=2))]
        )
        risks = self.rule.evaluate(snap, _now())
        assert risks[0].severity == "critical"


class TestContentBehindPlanRule:
    rule = ContentBehindPlanRule()

    def test_no_risk_when_on_plan(self):
        snap = _base_snapshot(
            content=ContentSnapshot(total_planned_to_date=10, total_published_to_date=10)
        )
        risks = self.rule.evaluate(snap, _now())
        assert risks == []

    def test_no_risk_at_threshold(self):
        snap = _base_snapshot(
            content=ContentSnapshot(total_planned_to_date=12, total_published_to_date=10)
        )
        risks = self.rule.evaluate(snap, _now())
        assert risks == []

    def test_risk_above_threshold(self):
        snap = _base_snapshot(
            content=ContentSnapshot(total_planned_to_date=15, total_published_to_date=10)
        )
        risks = self.rule.evaluate(snap, _now())
        assert len(risks) == 1
        assert risks[0].rule_key == "content_behind_plan"


class TestOverdueTasksRule:
    rule = OverdueTasksRule()

    def test_no_risk_when_no_overdue(self):
        snap = _base_snapshot(overdue_tasks=[])
        risks = self.rule.evaluate(snap, _now())
        assert risks == []

    def test_risk_for_overdue_group(self):
        snap = _base_snapshot(
            overdue_tasks=[OverdueTaskSnapshot("Marketing", "marketing", 3, ["t1", "t2", "t3"])]
        )
        risks = self.rule.evaluate(snap, _now())
        assert len(risks) == 1
        assert risks[0].rule_key == "tasks_overdue"


class TestEvaluateAll:
    def test_evaluate_all_returns_list(self):
        snap = _base_snapshot()
        results = evaluate_all(snap, _now())
        assert isinstance(results, list)

    def test_failing_rule_does_not_crash_pipeline(self):
        # Pass a broken snapshot that will cause some rules to fail
        snap = _base_snapshot()
        snap.registrations.days_remaining = -5
        results = evaluate_all(snap, _now())
        # Should not raise, even if some rules are skipped
        assert isinstance(results, list)
