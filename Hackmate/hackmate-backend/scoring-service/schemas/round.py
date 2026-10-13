from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RoundCreate(BaseModel):
    round_name: str
    start_time: datetime
    end_time: datetime
    max_score: int = 100
    description: Optional[str] = None


class RoundUpdate(BaseModel):
    round_name: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    max_score: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[int] = None


class RoundResponse(BaseModel):
    id: int
    round_name: str
    start_time: datetime
    end_time: datetime
    max_score: int
    description: Optional[str] = None
    is_active: int
    created_at: Optional[datetime] = None
    is_ongoing: Optional[bool] = None

    class Config:
        from_attributes = True
