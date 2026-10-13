from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class MentoringRound(Base):
    __tablename__ = "mentoring_rounds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    round_name = Column(String(255), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    max_score = Column(Integer, nullable=False, default=100)
    description = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
