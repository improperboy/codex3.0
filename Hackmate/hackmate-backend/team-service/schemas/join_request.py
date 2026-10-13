from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JoinRequestCreate(BaseModel):
    team_id: int
    message: Optional[str] = None


class JoinRequestRespond(BaseModel):
    status: str  # approved | rejected


class JoinRequestResponse(BaseModel):
    id: int
    user_id: int
    team_id: int
    status: str
    message: Optional[str] = None
    created_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    # enriched fields
    team_name: Optional[str] = None
    leader_name: Optional[str] = None

    class Config:
        from_attributes = True
