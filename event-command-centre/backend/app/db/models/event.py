"""Event ORM model."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, new_uuid


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # hackathon|workshop|bootcamp|webinar_series
    format: Mapped[str] = mapped_column(String(20), nullable=False)  # in_person|hybrid|virtual
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    audience: Mapped[str] = mapped_column(String(200), nullable=False)
    scale_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    venue_type: Mapped[str | None] = mapped_column(String(50))
    city: Mapped[str | None] = mapped_column(String(200))
    objectives: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    target_registrations: Mapped[int] = mapped_column(Integer, nullable=False)
    target_reach: Mapped[int | None] = mapped_column(Integer)
    target_partners: Mapped[int | None] = mapped_column(Integer)
    brief: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Relationships
    plans: Mapped[list["Plan"]] = relationship(back_populates="event", cascade="all, delete-orphan")  # noqa: F821
    tasks: Mapped[list["Task"]] = relationship(back_populates="event", cascade="all, delete-orphan")  # noqa: F821
    metric_snapshots: Mapped[list["MetricSnapshot"]] = relationship(back_populates="event", cascade="all, delete-orphan")  # noqa: F821
    channels: Mapped[list["Channel"]] = relationship(back_populates="event", cascade="all, delete-orphan")  # noqa: F821
    partners: Mapped[list["Partner"]] = relationship(back_populates="event", cascade="all, delete-orphan")  # noqa: F821
    logistics_items: Mapped[list["LogisticsItem"]] = relationship(back_populates="event", cascade="all, delete-orphan")  # noqa: F821
    content_items: Mapped[list["ContentItem"]] = relationship(back_populates="event", cascade="all, delete-orphan")  # noqa: F821
    risks: Mapped[list["Risk"]] = relationship(back_populates="event", cascade="all, delete-orphan")  # noqa: F821
    actions: Mapped[list["Action"]] = relationship(back_populates="event", cascade="all, delete-orphan")  # noqa: F821
    audit_events: Mapped[list["AuditEvent"]] = relationship(back_populates="event", cascade="all, delete-orphan")  # noqa: F821
