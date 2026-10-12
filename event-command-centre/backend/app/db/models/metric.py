"""MetricSnapshot ORM model."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, new_uuid

METRIC_KEYS = (
    "registrations",
    "visits",
    "reach",
    "partners_activated",
    "content_published",
    "form_starts",
    "confirmed_attendees",
)


class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_key: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")  # manual|seed|closure

    event: Mapped["Event"] = relationship(back_populates="metric_snapshots")  # noqa: F821
