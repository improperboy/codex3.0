from sqlalchemy import Column, Integer, String, Enum, Text, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Theme(Base):
    __tablename__ = "themes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color_code = Column(String(7), default="#3B82F6")
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    idea = Column(Text, nullable=True)
    problem_statement = Column(Text, nullable=True)
    tech_skills = Column(Text, nullable=True)
    theme_id = Column(Integer, nullable=True, index=True)
    leader_id = Column(Integer, nullable=True, index=True)
    floor_id = Column(Integer, nullable=True, index=True)
    room_id = Column(Integer, nullable=True, index=True)
    status = Column(Enum("draft", "pending", "approved", "rejected"), default="draft")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    team_id = Column(Integer, nullable=False, index=True)
    status = Column(Enum("pending", "approved", "rejected"), default="approved")
    joined_at = Column(DateTime, server_default=func.now())


class TeamInvitation(Base):
    __tablename__ = "team_invitations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer, nullable=False, index=True)
    from_user_id = Column(Integer, nullable=False)
    to_user_id = Column(Integer, nullable=False)
    status = Column(Enum("pending", "accepted", "rejected", "expired"), default="pending")
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    responded_at = Column(DateTime, nullable=True)


class TeamSkillRequirement(Base):
    __tablename__ = "team_skill_requirements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer, nullable=False, index=True)
    skill_id = Column(Integer, nullable=False)
    importance_level = Column(
        Enum("nice-to-have", "important", "critical"), default="important"
    )
    created_at = Column(DateTime, server_default=func.now())
