from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    setting_key = Column(String(100), nullable=False, unique=True)
    setting_value = Column(Text, nullable=True)
    setting_type = Column(
        String(20), default="string"
    )  # string | integer | boolean | json
    description = Column(Text, nullable=True)
    is_public = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    from_id = Column(Integer, nullable=False, index=True)
    from_role = Column(String(20), nullable=False)
    to_role = Column(String(20), nullable=False)
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    priority = Column(String(10), default="medium")
    floor_id = Column(Integer, nullable=True)
    room_id = Column(Integer, nullable=True)
    status = Column(String(20), default="open")
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, nullable=True)
    resolution_notes = Column(Text, nullable=True)
