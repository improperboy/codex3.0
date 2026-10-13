from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer, nullable=False, unique=True, index=True)
    github_link = Column(String(500), nullable=False)
    live_link = Column(String(500), nullable=True)
    tech_stack = Column(Text, nullable=False)
    demo_video = Column(String(500), nullable=True)
    ppt_link = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    submitted_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class SubmissionSettings(Base):
    __tablename__ = "submission_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_active = Column(Integer, default=0)
    max_file_size = Column(Integer, default=10485760)
    allowed_extensions = Column(String(255), default="pdf,doc,docx,zip,rar")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class GithubRepository(Base):
    __tablename__ = "github_repositories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    github_url = Column(String(500), nullable=False)
    repository_name = Column(String(255), nullable=False)
    repository_owner = Column(String(255), nullable=False)
    submitted_by = Column(Integer, nullable=False, index=True)
    status = Column(String(20), default="pending")
    github_data = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
