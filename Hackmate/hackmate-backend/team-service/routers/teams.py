import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.database import get_db
from dependencies import get_current_user, CurrentUser, check_team_management_enabled
from schemas.team import (
    TeamCreate, TeamUpdate, TeamStatusUpdate,
    TeamResponse, TeamListResponse, ThemeResponse, MemberResponse,
)
from services import team_service
from services.cache_service import cache_service
from config import settings


async def _notify(user_id: int, title: str, message: str, notif_type: str, url: str = "/") -> None:
    """Fire-and-forget notification publish — never blocks the request."""
    try:
        from services.event_publisher import publish_notification
        await publish_notification(user_id=user_id, title=title, message=message, notif_type=notif_type, url=url)
    except Exception:
        pass  # notifications are non-critical

router = APIRouter()


def _enrich(team, db: Session) -> TeamResponse:
    """Attach leader_name, floor_number, room_number in a single JOIN query."""
    data = TeamResponse.model_validate(team)
    try:
        row = db.execute(
            text("""
                SELECT
                    u.name        AS leader_name,
                    f.floor_number,
                    r.room_number
                FROM (SELECT 1) AS _dummy
                LEFT JOIN users  u ON u.id = :leader_id
                LEFT JOIN floors f ON f.id = :floor_id
                LEFT JOIN rooms  r ON r.id = :room_id
            """),
            {
                "leader_id": team.leader_id,
                "floor_id":  team.floor_id,
                "room_id":   team.room_id,
            },
        ).fetchone()
        if row:
            data.leader_name  = row[0]
            data.floor_number = row[1]
            data.room_number  = row[2]
    except Exception:
        db.rollback()
    return data


# ── Themes ─────────────────────────────────────────────────────────────────

@router.get("/themes", response_model=list[ThemeResponse])
def list_themes(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    return team_service.get_themes(db)


# ── Admin: list all teams ──────────────────────────────────────────────────

@router.get("/admin/all", response_model=TeamListResponse)
def admin_list_all_teams(
    status: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    total, teams = team_service.get_teams(db, status=status, search=search, skip=skip, limit=limit)
    result = []
    for t in teams:
        t.member_count = team_service.get_member_count(db, t.id)
        result.append(_enrich(t, db))
    return TeamListResponse(total=total, teams=result)


# ── Admin: approve team ────────────────────────────────────────────────────

@router.put("/{team_id}/approve", response_model=TeamResponse)
async def approve_team(
    team_id: int,
    payload: TeamStatusUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    team = team_service.update_team_status(db, team, "approved", payload.floor_id, payload.room_id)
    team.member_count = team_service.get_member_count(db, team.id)
    if team.leader_id:
        await _notify(
            team.leader_id,
            "Team Approved",
            f"Your team '{team.name}' has been approved.",
            "team_approved",
            f"/teams/{team.id}",
        )
    return _enrich(team, db)


# ── Admin: reject team ─────────────────────────────────────────────────────

@router.put("/{team_id}/reject", response_model=TeamResponse)
async def reject_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    team = team_service.update_team_status(db, team, "rejected")
    team.member_count = team_service.get_member_count(db, team.id)
    if team.leader_id:
        await _notify(
            team.leader_id,
            "Team Rejected",
            f"Your team '{team.name}' was not approved.",
            "team_rejected",
            f"/teams/{team.id}",
        )
    return _enrich(team, db)


# ── Admin: delete team ─────────────────────────────────────────────────────

@router.delete("/{team_id}", status_code=204)
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    if current_user.role != "admin" and team.leader_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Admin or Team Leader access required")
        
    team_service.delete_team(db, team)


# ── Mentor: assigned teams ─────────────────────────────────────────────────

@router.get("/mentor/assigned", response_model=TeamListResponse)
def mentor_assigned_teams(
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return all approved teams in the mentor's assigned floor/room locations."""
    if current_user.role not in ("mentor", "admin"):
        raise HTTPException(status_code=403, detail="Mentor or admin access required")

    rows = db.execute(text("""
        SELECT DISTINCT t.id
        FROM teams t
        JOIN mentor_assignments ma ON ma.floor_id = t.floor_id AND ma.room_id = t.room_id
        WHERE ma.mentor_id = :mentor_id AND t.status = 'approved'
    """), {"mentor_id": current_user.user_id}).fetchall()

    team_ids = [r[0] for r in rows]
    if not team_ids:
        return TeamListResponse(total=0, teams=[])

    teams = []
    for tid in team_ids:
        t = team_service.get_team_by_id(db, tid)
        if not t:
            continue
        if search:
            s = search.lower()
            if s not in (t.name or "").lower() and s not in (t.idea or "").lower():
                continue
        t.member_count = team_service.get_member_count(db, t.id)
        teams.append(_enrich(t, db))

    return TeamListResponse(total=len(teams), teams=teams)


# ── Volunteer: mentors in assigned location ───────────────────────────────

@router.get("/volunteer/mentors", response_model=list[dict])
def volunteer_assigned_mentors(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return mentors assigned to the same floor/room as the volunteer."""
    if current_user.role not in ("volunteer", "admin"):
        raise HTTPException(status_code=403, detail="Volunteer or admin access required")

    rows = db.execute(text("""
        SELECT DISTINCT u.id, u.name, u.email, u.tech_stack,
               f.floor_number, r.room_number, ma.floor_id, ma.room_id
        FROM users u
        JOIN mentor_assignments ma ON ma.mentor_id = u.id
        JOIN volunteer_assignments va ON va.floor_id = ma.floor_id AND va.room_id = ma.room_id
        JOIN floors f ON f.id = ma.floor_id
        JOIN rooms r ON r.id = ma.room_id
        WHERE va.volunteer_id = :volunteer_id
    """), {"volunteer_id": current_user.user_id}).fetchall()

    return [
        {
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "tech_stack": row[3],
            "floor_number": row[4],
            "room_number": row[5],
            "floor_id": row[6],
            "room_id": row[7],
        }
        for row in rows
    ]


# ── Volunteer: assigned teams ─────────────────────────────────────────────

@router.get("/volunteer/assigned", response_model=TeamListResponse)
def volunteer_assigned_teams(
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return all approved teams in the volunteer's assigned floor/room locations."""
    if current_user.role not in ("volunteer", "admin"):
        raise HTTPException(status_code=403, detail="Volunteer or admin access required")

    rows = db.execute(text("""
        SELECT DISTINCT t.id
        FROM teams t
        JOIN volunteer_assignments va ON va.floor_id = t.floor_id AND va.room_id = t.room_id
        WHERE va.volunteer_id = :volunteer_id AND t.status = 'approved'
    """), {"volunteer_id": current_user.user_id}).fetchall()

    team_ids = [r[0] for r in rows]
    if not team_ids:
        return TeamListResponse(total=0, teams=[])

    teams = []
    for tid in team_ids:
        t = team_service.get_team_by_id(db, tid)
        if not t:
            continue
        if search:
            s = search.lower()
            if s not in (t.name or "").lower() and s not in (t.idea or "").lower():
                continue
        t.member_count = team_service.get_member_count(db, t.id)
        teams.append(_enrich(t, db))

    return TeamListResponse(total=len(teams), teams=teams)


# ── List teams ─────────────────────────────────────────────────────────────

@router.get("/", response_model=TeamListResponse)
def list_teams(
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # Participants can see approved, pending, and draft teams
    allowed_statuses = None
    if current_user.role == "participant":
        if status not in ("approved", "pending", "draft"):
            status = None
            allowed_statuses = ["approved", "pending", "draft"]
    total, teams = team_service.get_teams(db, status=status, skip=skip, limit=limit, allowed_statuses=allowed_statuses)
    result = []
    for t in teams:
        t.member_count = team_service.get_member_count(db, t.id)
        result.append(_enrich(t, db))
    return TeamListResponse(total=total, teams=result)


# ── My team ────────────────────────────────────────────────────────────────

@router.get("/my", response_model=TeamResponse)
def my_team(db: Session = Depends(get_db), current_user: CurrentUser = Depends(get_current_user)):
    team = team_service.get_user_team(db, current_user.user_id)
    if not team:
        raise HTTPException(status_code=404, detail="You are not in any team")
    team.member_count = team_service.get_member_count(db, team.id)
    return _enrich(team, db)


# ── Get team by ID ─────────────────────────────────────────────────────────

@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    key = f"hackmate:team:v1:{team_id}"
    cached = cache_service.get_json(key)
    if cached is not None:
        return cached

    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    team.member_count = team_service.get_member_count(db, team.id)
    enriched = _enrich(team, db)
    cache_service.set_json(key, enriched.model_dump(mode="json"), ttl_seconds=120)
    return enriched


# ── Create team ────────────────────────────────────────────────────────────

@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # Check if team management is enabled
    check_team_management_enabled(db)
    
    if current_user.role != "participant":
        raise HTTPException(status_code=403, detail="Only participants can create teams")

    # Already in an approved team?
    if team_service.get_user_team(db, current_user.user_id):
        raise HTTPException(status_code=409, detail="You are already in a team")

    # Already created a team before (even if rejected)?
    if team_service.has_any_team_as_leader(db, current_user.user_id):
        raise HTTPException(status_code=409, detail="You can only create one team")

    # Has pending join requests?
    if team_service.has_pending_join_requests(db, current_user.user_id):
        raise HTTPException(
            status_code=409,
            detail="You have pending join requests. Cancel them before creating a team.",
        )

    try:
        team = team_service.create_team(db, payload, current_user.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    team.member_count = 1
    return _enrich(team, db)


# ── Submit team for approval (leader) ─────────────────────────────────────

@router.post("/{team_id}/submit-approval", response_model=TeamResponse)
async def submit_team_for_approval(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Leader submits a draft team for admin approval.
    Requires: team is in 'draft' status, leader is the requester,
    and team has at least min_team_size and at most max_team_size approved members.
    """
    if current_user.role != "participant":
        raise HTTPException(status_code=403, detail="Only participants can submit teams for approval")

    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.leader_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the team leader can submit for approval")

    if team.status not in ("draft", "pending"):
        if team.status == "approved":
            raise HTTPException(status_code=409, detail="Team is already approved")
        else:
            raise HTTPException(status_code=409, detail=f"Team cannot be submitted from '{team.status}' status")

    min_size = team_service.get_min_team_size(db)
    max_size = team_service.get_max_team_size(db)
    member_count = team_service.get_member_count(db, team_id)

    if member_count < min_size:
        raise HTTPException(
            status_code=400,
            detail=f"Team needs at least {min_size} member(s) to submit for approval. Currently has {member_count}.",
        )

    if member_count > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"Team has too many members ({member_count}). Maximum allowed is {max_size}.",
        )

    team = team_service.update_team_status(db, team, "pending")
    team.member_count = member_count

    # Notify admins
    admin_rows = db.execute(text("SELECT id FROM users WHERE role = 'admin'")).fetchall()
    for row in admin_rows:
        await _notify(
            row[0],
            "Team Submitted for Approval",
            f"Team '{team.name}' has been submitted for approval ({member_count} members).",
            "team_submitted",
            f"/admin/teams",
        )

    return _enrich(team, db)


# ── Update team ────────────────────────────────────────────────────────────

@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int,
    payload: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.leader_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only team leader or admin can update")

    updated = team_service.update_team(db, team, payload)
    updated.member_count = team_service.get_member_count(db, updated.id)
    return _enrich(updated, db)


# ── Approve / Reject team (admin) ──────────────────────────────────────────

@router.put("/{team_id}/status", response_model=TeamResponse)
def update_team_status(
    team_id: int,
    payload: TeamStatusUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    updated = team_service.update_team_status(db, team, payload.status, payload.floor_id, payload.room_id)
    updated.member_count = team_service.get_member_count(db, updated.id)
    return _enrich(updated, db)


# ── Get team members ───────────────────────────────────────────────────────

@router.get("/{team_id}/members", response_model=list[MemberResponse])
def get_members(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team_service.get_team_members(db, team_id)


# ── Remove member ──────────────────────────────────────────────────────────

@router.delete("/{team_id}/members/{user_id}", status_code=204)
def remove_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Leader can remove others; anyone can remove themselves; admin can remove anyone
    if (current_user.user_id != user_id
            and team.leader_id != current_user.user_id
            and current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to remove this member")

    if user_id == team.leader_id:
        raise HTTPException(status_code=400, detail="Cannot remove team leader")

    removed = team_service.remove_member(db, team_id, user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Member not found")
