"""Risks router — list risks."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import get_clock
from app.db.models.risk import Risk
from app.db.session import get_session
from app.schemas.risk import RiskListOut, RiskOut

router = APIRouter(tags=["risks"])


@router.get("/events/{event_id}/risks", response_model=RiskListOut)
async def list_risks(
    event_id: str,
    include_resolved: bool = False,
    session: AsyncSession = Depends(get_session),
    clock=Depends(get_clock),
):
    now: datetime = clock()
    q = select(Risk).where(Risk.event_id == event_id)
    if not include_resolved:
        q = q.where(Risk.resolved_at.is_(None))
    q = q.order_by(Risk.severity.desc(), Risk.detected_at.desc())
    risks = list((await session.execute(q)).scalars())

    evaluated_at = max((r.detected_at for r in risks if r.resolved_at is None), default=None)

    return RiskListOut(
        risks=[
            RiskOut(
                id=r.id,
                rule_key=r.rule_key,
                type=r.type,
                severity=r.severity,
                owner_role=r.owner_role,
                evidence=r.evidence,
                detected_at=r.detected_at,
                resolved_at=r.resolved_at,
                resolution_note=r.resolution_note,
            )
            for r in risks
        ],
        evaluated_at=evaluated_at,
    )
