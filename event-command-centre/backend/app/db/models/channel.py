"""Channel and ChannelDailyStat ORM models."""
from __future__ import annotations

from datetime import date

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, new_uuid


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_campus: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_top_converting: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    event: Mapped["Event"] = relationship(back_populates="channels")  # noqa: F821
    daily_stats: Mapped[list["ChannelDailyStat"]] = relationship(back_populates="channel", cascade="all, delete-orphan")


class ChannelDailyStat(Base):
    __tablename__ = "channel_daily_stats"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    channel_id: Mapped[str] = mapped_column(String(36), ForeignKey("channels.id", ondelete="CASCADE"), nullable=False, index=True)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    visits: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    registrations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    channel: Mapped["Channel"] = relationship(back_populates="daily_stats")

    __table_args__ = (
        UniqueConstraint("channel_id", "day", name="uq_channel_daily"),
    )
