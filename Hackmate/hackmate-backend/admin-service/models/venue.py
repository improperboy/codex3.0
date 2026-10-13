from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Floor(Base):
    __tablename__ = "floors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    floor_number = Column(String(10), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    floor_id = Column(Integer, nullable=False, index=True)
    room_number = Column(String(10), nullable=False)
    capacity = Column(Integer, default=4)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class MentorAssignment(Base):
    __tablename__ = "mentor_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mentor_id = Column(Integer, nullable=False, index=True)
    floor_id = Column(Integer, nullable=False)
    room_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class VolunteerAssignment(Base):
    __tablename__ = "volunteer_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    volunteer_id = Column(Integer, nullable=False, index=True)
    floor_id = Column(Integer, nullable=False)
    room_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class MentorRecommendation(Base):
    __tablename__ = "mentor_recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    participant_id = Column(Integer, nullable=False, index=True)
    mentor_id = Column(Integer, nullable=False, index=True)
    match_score = Column(String(8), nullable=False)
    skill_match_details = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
