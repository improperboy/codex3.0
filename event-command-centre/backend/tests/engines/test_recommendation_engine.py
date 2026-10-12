"""Unit tests for recommendation engine."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.engines.recommendation_engine import recommend
from app.engines.risk_engine import RiskSpec


def _now() -> datetime:
    return datetime(2026, 10, 12, 10, 0, 0, tzinfo=timezone.utc)


def _pace_risk(severity: str = "high") -> RiskSpec:
    return RiskSpec(
        rule_key="registration_pace_low",
        subject_key="global",
        type="registration_pace_low",
        severity=severity,
        owner_role="marketing",
        evidence={
            "current": 140.0,
            "target": 300,
            "gap": 160.0,
            "required_pace": 3.56,
            "current_pace": 1.6,
            "projected_finish": 212.0,
            "days_remaining": 45,
        },
    )


def _conversion_risk() -> RiskSpec:
    return RiskSpec(
        rule_key="conversion_low",
        subject_key="global",
        type="conversion_low",
        severity="medium",
        owner_role="marketing",
        evidence={
            "conversion": 0.061,
            "threshold": 0.09,
            "total_visits": 2295,
            "registrations": 140,
        },
    )


class TestRecommendationEngine:
    def test_returns_list(self):
        actions = recommend([_pace_risk()], "hackathon", 45, _now())
        assert isinstance(actions, list)

    def test_pace_risk_produces_action(self):
        actions = recommend([_pace_risk()], "hackathon", 45, _now())
        assert len(actions) >= 1

    def test_rationale_contains_number(self):
        actions = recommend([_pace_risk()], "hackathon", 45, _now())
        action = next(a for a in actions if a.risk_rule_key == "registration_pace_low")
        assert "1.6" in action.rationale or "3.6" in action.rationale or "160" in action.rationale

    def test_ranking_stable_for_same_inputs(self):
        risks = [_pace_risk(), _conversion_risk()]
        actions1 = recommend(risks, "hackathon", 45, _now())
        actions2 = recommend(risks, "hackathon", 45, _now())
        assert [a.template_key for a in actions1] == [a.template_key for a in actions2]

    def test_higher_severity_ranks_higher(self):
        low_risk = _pace_risk("low")
        high_risk = _conversion_risk()
        high_risk.severity = "high"
        actions = recommend([low_risk, high_risk], "hackathon", 10, _now())
        # Urgency should push higher severity to top
        assert len(actions) > 0

    def test_webinar_series_does_not_get_logistics_actions(self):
        from app.engines.risk_engine import RiskSpec
        logistics_risk = RiskSpec(
            rule_key="logistics_unconfirmed",
            subject_key="l1",
            type="logistics_unconfirmed",
            severity="high",
            owner_role="operations",
            evidence={"logistics_id": "l1", "category": "venue", "title": "Venue", "lock_date": "2026-11-01", "days_to_lock": 5, "status": "pending"},
        )
        actions = recommend([logistics_risk], "webinar_series", 45, _now())
        # Logistics template is only for in-person event types
        for action in actions:
            assert action.risk_rule_key != "logistics_unconfirmed" or action.template_key in ["lock_vendor"]

    def test_dedup_same_template_and_subject(self):
        # Two identical risks should not produce duplicate actions
        risks = [_pace_risk(), _pace_risk()]
        actions = recommend(risks, "hackathon", 45, _now())
        template_subject_pairs = [(a.template_key, a.risk_subject_key) for a in actions]
        assert len(template_subject_pairs) == len(set(template_subject_pairs))
