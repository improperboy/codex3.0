"""Recommendation engine — pure function, no database, no I/O.

Maps risks to ranked action templates. Every action carries a rationale
built from the triggering risk's evidence values.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.engines.constants import (
    ACTION_TEMPLATES,
    EFFORT_SCORES,
    IMPACT_SCORES,
)
from app.engines.risk_engine import RiskSpec


@dataclass
class ActionSpec:
    template_key: str
    title: str
    rationale: str
    owner_role: str
    expected_impact: str
    effort: str
    urgency: float
    risk_rule_key: str
    risk_subject_key: str
    checklist: list[str] = field(default_factory=list)
    score: float = 0.0


def _build_rationale(template: str, evidence: dict) -> str:
    """Fill template placeholders with evidence values; fall back gracefully."""
    try:
        return template.format(**evidence)
    except (KeyError, ValueError):
        return template


def _compute_urgency(risk: RiskSpec, days_remaining: int) -> float:
    """Urgency 0–1 based on severity and days remaining."""
    severity_base = {"critical": 1.0, "high": 0.75, "medium": 0.5, "low": 0.25}
    base = severity_base.get(risk.severity, 0.5)
    # Scale up urgency as the event approaches
    time_factor = max(0.0, 1.0 - days_remaining / 45)
    return min(1.0, base + time_factor * 0.25)


def recommend(
    risks: list[RiskSpec],
    event_type: str,
    days_remaining: int,
    now: datetime,
) -> list[ActionSpec]:
    """Return ranked action recommendations for the given risks.

    Rules:
    - One action per risk template key (dedup by template_key + subject_key).
    - Rank by: urgency desc, then impact/effort score desc, then title asc.
    """
    actions: list[ActionSpec] = []
    seen: set[tuple[str, str]] = set()

    for risk in risks:
        templates = ACTION_TEMPLATES.get(risk.rule_key, [])
        for tmpl in templates:
            # Filter by event type
            if event_type not in tmpl.get("event_types", [event_type]):
                continue

            dedup_key = (tmpl["template_key"], risk.subject_key)
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            # Build title (may contain {category}, {workstream} etc.)
            ev = risk.evidence
            try:
                title = tmpl["title"].format(**ev)
            except (KeyError, ValueError):
                title = tmpl["title"]

            # Owner role substitution
            owner_role = tmpl.get("owner_role", "marketing")
            try:
                owner_role = owner_role.format(**ev)
            except (KeyError, ValueError):
                pass

            rationale = _build_rationale(tmpl["rationale_template"], ev)
            urgency = _compute_urgency(risk, days_remaining)

            impact = tmpl.get("expected_impact", "medium")
            effort = tmpl.get("effort", "medium")
            score = (
                urgency * 10
                + IMPACT_SCORES.get(impact, 2.0)
                + EFFORT_SCORES.get(effort, 2.0)
            )

            actions.append(
                ActionSpec(
                    template_key=tmpl["template_key"],
                    title=title,
                    rationale=rationale,
                    owner_role=owner_role,
                    expected_impact=impact,
                    effort=effort,
                    urgency=round(urgency, 3),
                    risk_rule_key=risk.rule_key,
                    risk_subject_key=risk.subject_key,
                    checklist=tmpl.get("checklist", []),
                    score=score,
                )
            )

    # Sort: score desc, then title asc for stability
    actions.sort(key=lambda a: (-a.score, a.title))
    return actions
