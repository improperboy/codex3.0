from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "participant"
    tech_stack: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    tech_stack: Optional[str] = None
    floor: Optional[str] = None
    room: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    tech_stack: Optional[str] = None
    floor: Optional[str] = None
    room: Optional[str] = None
    created_at: Optional[datetime] = None
    in_team: Optional[int] = 0
    has_pending_invite: Optional[int] = 0

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    total: int
    users: List[UserResponse]


class SkillResponse(BaseModel):
    id: int
    name: str
    category: str

    class Config:
        from_attributes = True


class UserSkillAdd(BaseModel):
    skill_id: int
    proficiency_level: str = "intermediate"


class UserSkillResponse(BaseModel):
    id: int
    skill_id: int
    skill_name: str
    category: str
    proficiency_level: str

    class Config:
        from_attributes = True


class PasswordResetByAdmin(BaseModel):
    new_password: str
