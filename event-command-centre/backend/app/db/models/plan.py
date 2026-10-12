"""Plan, Workstream, and Milestone ORM models."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, new_uuid


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    rules_applied: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    engine_version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    event: Mapped["Event"] = relationship(back_populates="plans")  # noqa: F821
    workstreams: Mapped[list["Workstream"]] = relationship(back_populates="plan", cascade="all, delete-orphan")
    milestones: Mapped[list["Milestone"]] = relationship(back_populates="plan", cascade="all, delete-orphan")


class Workstream(Base):
    __tablename__ = "workstreams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    plan_id: Mapped[str] = mapped_column(String(36), ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    owner_role: Mapped[str] = mapped_column(String(50), nullable=False)

    plan: Mapped["Plan"] = relationship(back_populates="workstreams")
    tasks: Mapped[list["Task"]] = relationship(back_populates="workstream")  # noqa: F821


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    plan_id: Mapped[str] = mapped_column(String(36), ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    plan: Mapped["Plan"] = relationship(back_populates="milestones")
