"""ContentItem ORM model."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, new_uuid


class ContentItem(Base, TimestampMixin):
    __tablename__ = "content_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    channel_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("channels.id", ondelete="SET NULL"))
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # post|newsletter|video|blog
    planned_date: Mapped[date] = mapped_column(Date, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    owner_role: Mapped[str] = mapped_column(String(50), nullable=False, default="marketing")
    title: Mapped[str | None] = mapped_column(String(200))

    event: Mapped["Event"] = relationship(back_populates="content_items")  # noqa: F821
    channel: Mapped["Channel | None"] = relationship()  # noqa: F821
