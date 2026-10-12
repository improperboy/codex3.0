"""Audit service — the only writer to audit_events."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit import AuditEvent


async def log(
    session: AsyncSession,
    *,
    event_id: str,
    actor_role: str,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    payload: dict | None = None,
) -> AuditEvent:
    """Append one audit entry within the caller's transaction."""
    entry = AuditEvent(
        event_id=event_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload or {},
    )
    session.add(entry)
    # No commit — the caller's transaction owns that
    return entry
