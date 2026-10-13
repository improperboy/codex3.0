from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime


class SubmissionCreate(BaseModel):
    team_id: int
    github_link: str
    live_link: Optional[str] = None
    tech_stack: str
    demo_video: Optional[str] = None
    ppt_link: Optional[str] = None
    description: Optional[str] = None


class SubmissionUpdate(BaseModel):
    github_link: Optional[str] = None
    live_link: Optional[str] = None
    tech_stack: Optional[str] = None
    demo_video: Optional[str] = None
    ppt_link: Optional[str] = None
    description: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: int
    team_id: int
    github_link: str
    live_link: Optional[str] = None
    tech_stack: str
    demo_video: Optional[str] = None
    ppt_link: Optional[str] = None
    description: Optional[str] = None
    submitted_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubmissionListResponse(BaseModel):
    total: int
    submissions: List[SubmissionResponse]


class GithubValidateRequest(BaseModel):
    github_url: str


class GithubValidateResponse(BaseModel):
    valid: bool
    owner: Optional[str] = None
    repo: Optional[str] = None
    stars: Optional[int] = None
    language: Optional[str] = None
    description: Optional[str] = None
    error: Optional[str] = None


class SubmissionSettingsResponse(BaseModel):
    id: int
    start_time: datetime
    end_time: datetime
    is_active: int
    max_file_size: int
    allowed_extensions: str

    class Config:
        from_attributes = True


class SubmissionSettingsUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_active: Optional[int] = None
    max_file_size: Optional[int] = None
    allowed_extensions: Optional[str] = None
