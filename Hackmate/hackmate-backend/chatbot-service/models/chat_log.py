from sqlalchemy import Column, Integer, Text, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class ChatbotLog(Base):
    __tablename__ = "chatbot_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)
