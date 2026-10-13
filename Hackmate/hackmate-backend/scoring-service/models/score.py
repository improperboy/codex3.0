from sqlalchemy import Column, Integer, Text, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mentor_id = Column(Integer, nullable=False, index=True)
    team_id = Column(Integer, nullable=False, index=True)
    round_id = Column(Integer, nullable=False, index=True)
    score = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
