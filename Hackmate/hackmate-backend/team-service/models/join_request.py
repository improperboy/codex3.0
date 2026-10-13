from sqlalchemy import Column, Integer, Enum, Text, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class JoinRequest(Base):
    __tablename__ = "join_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    team_id = Column(Integer, nullable=False, index=True)
    status = Column(
        Enum("pending", "approved", "rejected", "expired"), default="pending"
    )
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    responded_at = Column(DateTime, nullable=True)
