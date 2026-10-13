from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ── Settings ───────────────────────────────────────────────────────────────

class SettingResponse(BaseModel):
    id: int
    setting_key: str
    setting_value: Optional[str] = None
    setting_type: str
    description: Optional[str] = None
    is_public: int

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    setting_value: str


class TeamManagementSetting(BaseModel):
    enabled: bool
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    
    class Config:
        # Allow empty strings to be treated as None
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class TeamManagementResponse(BaseModel):
    enabled: bool
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_currently_active: bool


class DatabaseResetRequest(BaseModel):
    confirmation: str


class DatabaseResetResponse(BaseModel):
    success: bool
    message: str
    admins_preserved: List[Any]
    deleted_counts: dict
    total_deleted: int


# ── Venue ──────────────────────────────────────────────────────────────────

class FloorCreate(BaseModel):
    floor_number: str
    description: Optional[str] = None


class FloorResponse(BaseModel):
    id: int
    floor_number: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoomCreate(BaseModel):
    floor_id: int
    room_number: str
    capacity: int = 4
    description: Optional[str] = None


class RoomResponse(BaseModel):
    id: int
    floor_id: int
    room_number: str
    capacity: int
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AssignmentCreate(BaseModel):
    mentor_id: int
    floor_id: int
    room_id: int


class VolunteerAssignmentCreate(BaseModel):
    volunteer_id: int
    floor_id: int
    room_id: int


class AssignmentResponse(BaseModel):
    id: int
    mentor_id: int
    floor_id: int
    room_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VolunteerAssignmentResponse(BaseModel):
    id: int
    volunteer_id: int
    floor_id: int
    room_id: int
    floor_number: Optional[str] = None
    room_number: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TeamLocationInfo(BaseModel):
    team_id: int
    team_name: str
    floor_id: Optional[int] = None
    room_id: Optional[int] = None


class TeamReassignLocation(BaseModel):
    team_id: int
    new_floor_id: int
    new_room_id: int


class BulkTeamReassign(BaseModel):
    reassignments: List[TeamReassignLocation]


# ── Support messages ───────────────────────────────────────────────────────

class SupportMessageCreate(BaseModel):
    to_role: str
    subject: Optional[str] = None
    message: str
    priority: str = "medium"
    floor_id: Optional[int] = None
    room_id: Optional[int] = None


class SupportMessageResolve(BaseModel):
    resolution_notes: Optional[str] = None


class SupportMessageResponse(BaseModel):
    id: int
    from_id: int
    from_role: str
    to_role: str
    subject: Optional[str] = None
    message: str
    priority: str
    status: str
    floor_id: Optional[int] = None
    room_id: Optional[int] = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True


# ── Themes ────────────────────────────────────────────────────────────────

class ThemeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color_code: str = "#3B82F6"
    is_active: int = 1


class ThemeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color_code: Optional[str] = None
    is_active: Optional[int] = None


class ThemeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color_code: str
    is_active: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Analytics ──────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_users: int
    total_teams: int
    pending_teams: int
    approved_teams: int
    total_submissions: int
    open_support_requests: int
    total_mentors: int
    total_volunteers: int
    total_participants: int
    assigned_mentors: int
    assigned_volunteers: int


class DailyActivity(BaseModel):
    date: str
    label: str
    users: int
    teams: int
    submissions: int


class AnalyticsResponse(BaseModel):
    stats: DashboardStats
    daily_activity: List[DailyActivity]
    role_distribution: dict
    team_status_distribution: dict
    avg_scores_per_round: List[dict]
    top_tech_stacks: List[dict]
    teams_per_location: List[dict]


# ── Announcements ──────────────────────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    is_pinned: int = 0
    target_roles: Optional[str] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    is_pinned: Optional[int] = None
    target_roles: Optional[str] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    author_id: int
    is_pinned: int
    target_roles: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
