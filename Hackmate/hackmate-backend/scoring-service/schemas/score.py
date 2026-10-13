from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ScoreSubmit(BaseModel):
    team_id: int
    round_id: int
    score: int
    comment: Optional[str] = None


class ScoreUpdate(BaseModel):
    score: int
    comment: Optional[str] = None


class ScoreResponse(BaseModel):
    id: int
    mentor_id: int
    team_id: int
    round_id: int
    score: int
    comment: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TeamRankingEntry(BaseModel):
    rank: int
    team_id: int
    team_name: str
    leader_name: str
    floor_number: Optional[str] = None
    room_number: Optional[str] = None
    rounds_participated: int
    scores_count: int
    average_score: float
    total_score: float


class RankingsResponse(BaseModel):
    rankings: List[TeamRankingEntry]
