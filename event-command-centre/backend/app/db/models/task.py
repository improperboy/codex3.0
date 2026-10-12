"""Task and ChecklistItem ORM models."""
from __future__ import annotations

from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base, TimestampMixin, new_uuid

TASK_STATUSES = ("todo", "in_progress", "blocked", "done")


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    workstream_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("workstreams.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    owner_role: Mapped[str] = mapped_column(String(50), nullable=False)
    owner_name: Mapped[str | None] = mapped_column(String(200))
    due_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="todo")
    source_action_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("actions.id", ondelete="SET NULL"))
    success_criterion: Mapped[str | None] = mapped_column(Text)
    blocked_reason: Mapped[str | None] = mapped_column(Text)

    event: Mapped["Event"] = relationship(back_populates="tasks")  # noqa: F821
    workstream: Mapped["Workstream | None"] = relationship(back_populates="tasks")  # noqa: F821
    checklist_items: Mapped[list["ChecklistItem"]] = relationship(back_populates="task", cascade="all, delete-orphan", order_by="ChecklistItem.position")
    closure: Mapped["Closure | None"] = relationship(back_populates="task", uselist=False)  # noqa: F821
    source_action: Mapped["Action | None"] = relationship(foreign_keys=[source_action_id])  # noqa: F821


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    task_id: Mapped[str] = mapped_column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    task: Mapped["Task"] = relationship(back_populates="checklist_items")
