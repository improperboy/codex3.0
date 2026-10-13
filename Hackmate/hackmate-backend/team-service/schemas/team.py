from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ThemeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color_code: str
    is_active: int

    class Config:
        from_attributes = True


class TeamCreate(BaseModel):
    name: str
    idea: Optional[str] = None
    problem_statement: Optional[str] = None
    tech_skills: Optional[str] = None
    theme_id: Optional[int] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    idea: Optional[str] = None
    problem_statement: Optional[str] = None
    tech_skills: Optional[str] = None
    theme_id: Optional[int] = None


class TeamStatusUpdate(BaseModel):
    status: Optional[str] = None  # approved | rejected — optional for dedicated approve/reject endpoints
    floor_id: Optional[int] = None
    room_id: Optional[int] = None


class MemberResponse(BaseModel):
    id: int
    user_id: int
    team_id: int
    status: str
    joined_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TeamResponse(BaseModel):
    id: int
    name: str
    idea: Optional[str] = None
    problem_statement: Optional[str] = None
    tech_skills: Optional[str] = None
    theme_id: Optional[int] = None
    leader_id: Optional[int] = None
    leader_name: Optional[str] = None
    floor_id: Optional[int] = None
    room_id: Optional[int] = None
    floor_number: Optional[str] = None
    room_number: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    member_count: Optional[int] = None

    class Config:
        from_attributes = True


class TeamListResponse(BaseModel):
    total: int
    teams: List[TeamResponse]


class InvitationCreate(BaseModel):
    to_user_id: int
    message: Optional[str] = None


class InvitationResponse(BaseModel):
    id: int
    team_id: int
    from_user_id: int
    to_user_id: int
    to_user_name: Optional[str] = None
    status: str
    message: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
