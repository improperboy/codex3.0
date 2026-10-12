"""Partner ORM model."""
from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, new_uuid

PARTNER_STATUSES = ("prospect", "contacted", "confirmed", "activated")


class Partner(Base, TimestampMixin):
    __tablename__ = "partners"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    tier: Mapped[str] = mapped_column(String(50), nullable=False, default="standard")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="prospect")
    confirmation_due_date: Mapped[date | None] = mapped_column(Date)
    fallback_partner_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("partners.id", ondelete="SET NULL"))

    event: Mapped["Event"] = relationship(back_populates="partners")  # noqa: F821
    fallback_partner: Mapped["Partner | None"] = relationship(remote_side="Partner.id")
