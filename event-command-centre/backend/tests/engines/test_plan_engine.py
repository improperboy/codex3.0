"""Unit tests for the plan engine — no database required."""
from __future__ import annotations

from datetime import date, datetime, timezone

import pytest

from app.engines.plan_engine import create_plan, plan_preview
from app.schemas.brief import Brief


def _now(days_to_event: int = 45) -> datetime:
    today = date.today()
    return datetime(today.year, today.month, today.day, 10, 0, 0, tzinfo=timezone.utc)


def _brief(event_type: str = "hackathon", days: int = 45, fmt: str = "in_person") -> Brief:
    today = date.today()
    return Brief(
        name="Test Event",
        type=event_type,
        format=fmt,
        start_date=today + __import__("datetime").timedelta(days=days),
        end_date=today + __import__("datetime").timedelta(days=days + 1),
        audience="Students",
        scale_seats=300,
        target_registrations=300,
        objectives=["Build community"],
    )


class TestPlanEngineHackathon:
    def test_hackathon_has_six_workstreams(self):
        plan = create_plan(_brief("hackathon"), _now())
        names = [ws.name for ws in plan.workstreams]
        assert "Marketing" in names
        assert "Partnerships" in names
        assert "Operations" in names
        assert "Programme" in names
        assert "Content" in names
        assert "Leadership" in names

    def test_webinar_series_has_no_partnerships(self):
        plan = create_plan(_brief("webinar_series"), _now())
        names = [ws.name for ws in plan.workstreams]
        assert "Partnerships" not in names

    def test_hybrid_adds_streaming_workstream(self):
        plan = create_plan(_brief("hackathon", fmt="hybrid"), _now())
        names = [ws.name for ws in plan.workstreams]
        assert "Streaming" in names
        assert "hybrid_adds_streaming_workstream" in plan.rules_applied

    def test_in_person_no_streaming_workstream(self):
        plan = create_plan(_brief("hackathon", fmt="in_person"), _now())
        names = [ws.name for ws in plan.workstreams]
        assert "Streaming" not in names

    def test_milestones_generated(self):
        plan = create_plan(_brief(), _now())
        assert len(plan.milestones) > 0

    def test_tasks_generated(self):
        plan = create_plan(_brief(), _now())
        assert len(plan.tasks) > 0

    def test_content_items_generated(self):
        plan = create_plan(_brief(), _now())
        assert len(plan.content_items) > 0

    def test_logistics_items_generated(self):
        plan = create_plan(_brief(), _now())
        assert len(plan.logistics_items) > 0

    def test_compressed_plan_under_14_days(self):
        plan = create_plan(_brief(days=10), _now())
        assert "compressed_plan_under_14_days" in plan.rules_applied
        # Tasks should still be generated
        assert len(plan.tasks) > 0

    def test_catering_rule_adds_task(self):
        today = date.today()
        brief = Brief(
            name="Test",
            type="hackathon",
            format="in_person",
            start_date=today + __import__("datetime").timedelta(days=45),
            end_date=today + __import__("datetime").timedelta(days=46),
            audience="Students",
            scale_seats=100,
            target_registrations=100,
            objectives=["Build"],
            needs_catering=True,
        )
        plan = create_plan(brief, _now())
        assert "catering_lock_date_task_added" in plan.rules_applied
        catering_tasks = [t for t in plan.tasks if "catering" in t.title.lower()]
        assert len(catering_tasks) >= 1

    def test_plan_is_deterministic(self):
        brief = _brief()
        now = _now()
        plan1 = create_plan(brief, now)
        plan2 = create_plan(brief, now)
        assert len(plan1.tasks) == len(plan2.tasks)
        assert plan1.rules_applied == plan2.rules_applied


class TestPlanPreview:
    def test_preview_returns_counts(self):
        result = plan_preview(_brief(), _now())
        assert result["task_count"] > 0
        assert len(result["workstream_names"]) > 0
        assert isinstance(result["warnings"], list)

    def test_preview_warns_compressed(self):
        result = plan_preview(_brief(days=8), _now())
        assert any("compressed" in w.lower() for w in result["warnings"])

    def test_preview_warns_hybrid(self):
        result = plan_preview(_brief(fmt="hybrid"), _now())
        assert any("hybrid" in w.lower() for w in result["warnings"])
