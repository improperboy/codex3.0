from sqlalchemy import Column, Integer, String, Text, DateTime, SmallInteger, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Theme(Base):
    __tablename__ = "themes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    color_code = Column(String(7), default="#3B82F6")
    is_active = Column(SmallInteger, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
