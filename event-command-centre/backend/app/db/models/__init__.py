"""Import all models so Alembic autogenerate can detect them."""
from app.db.models.audit import AuditEvent
from app.db.models.base import Base
from app.db.models.channel import Channel, ChannelDailyStat
from app.db.models.closure import Closure
from app.db.models.content import ContentItem
from app.db.models.event import Event
from app.db.models.logistics import LogisticsItem
from app.db.models.metric import MetricSnapshot
from app.db.models.partner import Partner
from app.db.models.plan import Milestone, Plan, Workstream
from app.db.models.risk import Action, Risk
from app.db.models.task import ChecklistItem, Task

__all__ = [
    "Base",
    "Event",
    "Plan",
    "Workstream",
    "Milestone",
    "Task",
    "ChecklistItem",
    "MetricSnapshot",
    "Channel",
    "ChannelDailyStat",
    "Partner",
    "LogisticsItem",
    "ContentItem",
    "Risk",
    "Action",
    "Closure",
    "AuditEvent",
]
