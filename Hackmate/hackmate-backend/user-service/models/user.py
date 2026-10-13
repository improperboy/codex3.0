from sqlalchemy import Column, Integer, String, Enum, Text, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    role = Column(Enum("admin", "mentor", "participant", "volunteer"), nullable=False)
    tech_stack = Column(Text, nullable=True)
    floor = Column(String(10), nullable=True)
    room = Column(String(10), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), default="general")
    created_at = Column(DateTime, server_default=func.now())


class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    skill_id = Column(Integer, nullable=False, index=True)
    proficiency_level = Column(
        Enum("beginner", "intermediate", "advanced", "expert"), default="intermediate"
    )
    created_at = Column(DateTime, server_default=func.now())
