from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.database import get_db
from dependencies import get_current_user, CurrentUser, check_team_management_enabled
from schemas.join_request import JoinRequestCreate, JoinRequestRespond, JoinRequestResponse
from services import team_service

router = APIRouter()


async def _notify(user_id: int, title: str, message: str, notif_type: str, url: str = "/") -> None:
    try:
        from services.event_publisher import publish_notification
        await publish_notification(user_id=user_id, title=title, message=message, notif_type=notif_type, url=url)
    except Exception:
        pass


# ── Send join request ──────────────────────────────────────────────────────

@router.post("/join-requests", response_model=JoinRequestResponse, status_code=201)
async def send_join_request(
    payload: JoinRequestCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # Check if team management is enabled
    check_team_management_enabled(db)
    
    if current_user.role != "participant":
        raise HTTPException(status_code=403, detail="Only participants can send join requests")

    # Already in a team?
    if team_service.get_user_team(db, current_user.user_id):
        raise HTTPException(status_code=409, detail="You are already in a team")

    team = team_service.get_team_by_id(db, payload.team_id)
    if not team or team.status not in ("approved", "pending", "draft"):
        raise HTTPException(status_code=404, detail="Team not found or not available for joining")

    # Team full? Read max size from DB settings
    max_size = team_service.get_max_team_size(db)
    current_count = team_service.get_member_count(db, payload.team_id)
    if current_count >= max_size:
        raise HTTPException(status_code=409, detail=f"Team is full ({current_count}/{max_size} members)")

    # Duplicate request?
    if team_service.get_pending_request(db, current_user.user_id, payload.team_id):
        raise HTTPException(status_code=409, detail="You already have a pending request for this team")

    # Max 3 requests per team
    from models.join_request import JoinRequest
    total_requests_to_team = db.query(JoinRequest).filter(
        JoinRequest.user_id == current_user.user_id,
        JoinRequest.team_id == payload.team_id
    ).count()

    if total_requests_to_team >= 3:
        raise HTTPException(status_code=403, detail="You can only send up to 3 join requests to the same team")

    jr = team_service.create_join_request(db, current_user.user_id, payload.team_id, payload.message)

    # Notify admins about the new join request
    from sqlalchemy import text as sql_text
    admin_rows = db.execute(sql_text("SELECT id FROM users WHERE role = 'admin'")).fetchall()
    for row in admin_rows:
        await _notify(
            row[0],
            "New Team Join Request",
            f"{current_user.name} wants to join team '{team.name}'.",
            "team_join_request",
            f"/admin/teams/{team.id}",
        )

    return jr


# ── My join requests ───────────────────────────────────────────────────────

@router.get("/join-requests/mine", response_model=list[JoinRequestResponse])
def my_join_requests(    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from models.team import Team, TeamMember
    from sqlalchemy import text
    rows = db.execute(text("""
        SELECT jr.id, jr.user_id, jr.team_id, jr.status, jr.message,
               jr.created_at, jr.responded_at,
               t.name as team_name, u.name as leader_name
        FROM join_requests jr
        JOIN teams t ON jr.team_id = t.id
        LEFT JOIN users u ON t.leader_id = u.id
        WHERE jr.user_id = :uid
        ORDER BY jr.created_at DESC
    """), {"uid": current_user.user_id}).fetchall()

    return [
        JoinRequestResponse(
            id=r[0], user_id=r[1], team_id=r[2], status=r[3],
            message=r[4], created_at=r[5], responded_at=r[6],
            team_name=r[7], leader_name=r[8],
        )
        for r in rows
    ]


# ── Team's incoming requests (leader/admin) ────────────────────────────────

@router.get("/{team_id}/join-requests", response_model=list[JoinRequestResponse])
def team_join_requests(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.leader_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only team leader or admin can view requests")

    return team_service.get_team_join_requests(db, team_id)


# ── Respond to join request (leader/admin) ─────────────────────────────────

@router.put("/join-requests/{request_id}", response_model=JoinRequestResponse)
def respond_to_request(
    request_id: int,
    payload: JoinRequestRespond,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # Check if team management is enabled (only when approving)
    if payload.status == "approved":
        check_team_management_enabled(db)
    
    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    jr = team_service.get_join_request(db, request_id)
    if not jr:
        raise HTTPException(status_code=404, detail="Join request not found")

    if jr.status != "pending":
        raise HTTPException(status_code=409, detail="Request already responded to")

    team = team_service.get_team_by_id(db, jr.team_id)
    if team.leader_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only team leader or admin can respond")

    if payload.status == "approved":
        max_size = team_service.get_max_team_size(db)
        current_count = team_service.get_member_count(db, jr.team_id)
        if current_count >= max_size:
            raise HTTPException(status_code=409, detail=f"Team is full ({max_size}/{max_size} members)")
        if team_service.get_user_team(db, jr.user_id):
            raise HTTPException(status_code=409, detail="This user is already in a team")

    try:
        return team_service.respond_join_request(db, jr, payload.status, team)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


# ── Cancel own join request ────────────────────────────────────────────────

@router.delete("/join-requests/{request_id}", status_code=204)
def cancel_join_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    jr = team_service.get_join_request(db, request_id)
    if not jr:
        raise HTTPException(status_code=404, detail="Join request not found")

    if jr.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Cannot cancel another user's request")

    if jr.status != "pending":
        raise HTTPException(status_code=409, detail="Can only cancel pending requests")

    db.delete(jr)
    db.commit()
