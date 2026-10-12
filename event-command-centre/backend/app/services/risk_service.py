"""Risk service — runs evaluation, diffs against open risks, writes audit entries."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.risk import Risk, Action
from app.engines.risk_engine import EventSnapshot, RiskSpec, evaluate_all
from app.engines.recommendation_engine import recommend, ActionSpec
from app.services import audit_service


async def evaluate_event(
    session: AsyncSession,
    *,
    event_id: str,
    event_type: str,
    snapshot: EventSnapshot,
    actor_role: str,
    now: datetime,
    days_remaining: int,
) -> tuple[list[Risk], list[Action]]:
    """Run all rules, diff against open risks, open/resolve as needed.

    Returns (open_risks, new_actions) after persisting changes.
    The caller must commit the transaction.
    """
    detected = evaluate_all(snapshot, now)

    # Load all currently open risks for this event
    open_risks_q = select(Risk).where(
        Risk.event_id == event_id,
        Risk.resolved_at.is_(None),
    )
    result = await session.execute(open_risks_q)
    open_risks: list[Risk] = list(result.scalars())

    # Build index: (rule_key, subject_key) -> Risk
    open_index: dict[tuple[str, str], Risk] = {
        (r.rule_key, r.subject_key): r for r in open_risks
    }

    # New risks from the engine
    detected_index: dict[tuple[str, str], RiskSpec] = {
        (d.rule_key, d.subject_key): d for d in detected
    }

    # --- Open new risks ---
    newly_opened: list[Risk] = []
    for key, spec in detected_index.items():
        if key not in open_index:
            risk = Risk(
                event_id=event_id,
                rule_key=spec.rule_key,
                subject_key=spec.subject_key,
                type=spec.type,
                severity=spec.severity,
                owner_role=spec.owner_role,
                evidence=spec.evidence,
            )
            session.add(risk)
            newly_opened.append(risk)
            await audit_service.log(
                session,
                event_id=event_id,
                actor_role=actor_role,
                action="risk_opened",
                entity_type="risk",
                entity_id=risk.id,
                payload={"rule_key": spec.rule_key, "severity": spec.severity},
            )
        else:
            # Update severity and evidence if changed
            existing = open_index[key]
            existing.severity = spec.severity
            existing.evidence = spec.evidence

    # --- Resolve risks no longer detected ---
    for key, risk in open_index.items():
        if key not in detected_index:
            risk.resolved_at = now
            risk.resolution_note = "Auto-resolved: condition no longer detected"
            await audit_service.log(
                session,
                event_id=event_id,
                actor_role=actor_role,
                action="risk_resolved",
                entity_type="risk",
                entity_id=risk.id,
                payload={"rule_key": risk.rule_key},
            )

    # Flush so newly_opened get their IDs assigned
    await session.flush()

    # --- Generate recommendations ---
    all_open_specs = list(detected_index.values())
    action_specs = recommend(all_open_specs, event_type, days_remaining, now)

    # Deactivate all existing suggested actions for this event
    existing_actions_q = select(Action).where(
        Action.event_id == event_id,
        Action.status == "suggested",
    )
    existing_result = await session.execute(existing_actions_q)
    for old_action in existing_result.scalars():
        old_action.status = "done"  # superseded

    # Find matching risk IDs for new actions
    await session.flush()
    fresh_risks_q = select(Risk).where(
        Risk.event_id == event_id,
        Risk.resolved_at.is_(None),
    )
    fresh_result = await session.execute(fresh_risks_q)
    risk_by_key: dict[tuple[str, str], Risk] = {
        (r.rule_key, r.subject_key): r for r in fresh_result.scalars()
    }

    new_actions: list[Action] = []
    for spec in action_specs:
        risk = risk_by_key.get((spec.risk_rule_key, spec.risk_subject_key))
        action = Action(
            event_id=event_id,
            risk_id=risk.id if risk else None,
            template_key=spec.template_key,
            title=spec.title,
            rationale=spec.rationale,
            owner_role=spec.owner_role,
            expected_impact=spec.expected_impact,
            effort=spec.effort,
            urgency=spec.urgency,
            status="suggested",
            checklist_template=spec.checklist,
        )
        session.add(action)
        new_actions.append(action)

    return list(detected_index.values()), new_actions
