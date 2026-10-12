"""LogisticsItem ORM model."""
from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, new_uuid

LOGISTICS_CATEGORIES = ("venue", "catering", "av", "travel", "swag")
LOGISTICS_STATUSES = ("pending", "in_progress", "confirmed", "cancelled")


class LogisticsItem(Base, TimestampMixin):
    __tablename__ = "logistics_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    lead_time_days: Mapped[int] = mapped_column(Integer, nullable=False, default=21)
    lock_date: Mapped[date | None] = mapped_column(Date)

    event: Mapped["Event"] = relationship(back_populates="logistics_items")  # noqa: F821
