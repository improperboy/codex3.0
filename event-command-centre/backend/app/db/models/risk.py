"""Risk and Action ORM models."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, new_uuid

RISK_SEVERITIES = ("low", "medium", "high", "critical")
ACTION_STATUSES = ("suggested", "accepted", "dismissed", "snoozed", "done")


class Risk(Base):
    __tablename__ = "risks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_key: Mapped[str] = mapped_column(String(100), nullable=False)
    subject_key: Mapped[str] = mapped_column(String(200), nullable=False, default="global")
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    owner_role: Mapped[str] = mapped_column(String(50), nullable=False)
    evidence: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolution_note: Mapped[str | None] = mapped_column(Text)

    event: Mapped["Event"] = relationship(back_populates="risks")  # noqa: F821
    actions: Mapped[list["Action"]] = relationship(back_populates="risk")


class Action(Base, TimestampMixin):
    __tablename__ = "actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("risks.id", ondelete="SET NULL"))
    template_key: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    owner_role: Mapped[str] = mapped_column(String(50), nullable=False)
    expected_impact: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")  # low|medium|high
    effort: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")  # low|medium|high
    urgency: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="suggested")
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dismiss_reason: Mapped[str | None] = mapped_column(Text)
    checklist_template: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    event: Mapped["Event"] = relationship(back_populates="actions")  # noqa: F821
    risk: Mapped["Risk | None"] = relationship(back_populates="actions")
    task: Mapped["Task | None"] = relationship(back_populates="source_action", foreign_keys="Task.source_action_id")  # noqa: F821
