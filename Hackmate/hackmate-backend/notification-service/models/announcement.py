from sqlalchemy import Column, Integer, String, Text, DateTime, func
from db.database import Base


class Post(Base):
    """Announcements are stored in the posts table."""
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    link_url = Column(String(500), nullable=True)
    link_text = Column(String(255), nullable=True)
    author_id = Column(Integer, nullable=False, index=True)
    is_pinned = Column(Integer, default=0)
    target_roles = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
