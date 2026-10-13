from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, CurrentUser, check_team_management_enabled
from schemas.team import InvitationCreate, InvitationResponse
from services import team_service

router = APIRouter()


# ── Send invitation (leader only) ──────────────────────────────────────────

@router.post("/{team_id}/invitations", response_model=InvitationResponse, status_code=201)
def send_invitation(
    team_id: int,
    payload: InvitationCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # Check if team management is enabled
    check_team_management_enabled(db)
    
    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.leader_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only team leader can send invitations")

    max_size = team_service.get_max_team_size(db)
    current_count = team_service.get_member_count(db, team_id)
    if current_count >= max_size:
        raise HTTPException(status_code=409, detail=f"Team is full ({current_count}/{max_size} members)")

    pending_count = team_service.get_pending_invitation_count(db, team_id)
    if current_count + pending_count >= max_size:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot send invitation. Team has {current_count} member(s) and {pending_count} pending invitation(s), which fills all {max_size} spots. Cancel a pending invitation to invite someone else.",
        )

    if team_service.get_user_team(db, payload.to_user_id):
        raise HTTPException(status_code=409, detail="This user is already in a team")

    if team_service.get_pending_invitation(db, team_id, payload.to_user_id):
        raise HTTPException(status_code=409, detail="Invitation already sent to this user")

    return team_service.create_invitation(
        db, team_id, current_user.user_id, payload.to_user_id, payload.message
    )


# ── My pending invitations ─────────────────────────────────────────────────

@router.get("/invitations/mine", response_model=list[InvitationResponse])
def my_invitations(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return team_service.get_user_invitations(db, current_user.user_id)


# ── Respond to invitation ──────────────────────────────────────────────────

@router.put("/invitations/{inv_id}", response_model=InvitationResponse)
def respond_invitation(
    inv_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    action = payload.get("status") or payload.get("action")
    if action not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Action must be 'accepted' or 'rejected'")

    # Check if team management is enabled (only when accepting)
    if action == "accepted":
        check_team_management_enabled(db)

    inv = team_service.get_invitation(db, inv_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if inv.to_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="This invitation is not for you")

    if inv.status != "pending":
        raise HTTPException(status_code=409, detail="Invitation already responded to")

    if action == "accepted":
        if team_service.get_user_team(db, current_user.user_id):
            raise HTTPException(status_code=409, detail="You are already in a team")
        max_size = team_service.get_max_team_size(db)
        if team_service.get_member_count(db, inv.team_id) >= max_size:
            raise HTTPException(status_code=409, detail=f"Team is full ({max_size}/{max_size} members)")

    try:
        return team_service.respond_invitation(db, inv, action)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


# ── Team sent invitations (leader/admin) ───────────────────────────────────

@router.get("/{team_id}/invitations/sent", response_model=list[InvitationResponse])
def team_sent_invitations(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    team = team_service.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if team.leader_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only team leader or admin can view sent invitations")

    invites = team_service.get_team_sent_invitations(db, team_id)
    return invites


# ── Cancel invitation (leader) ──────────────────────────────────────────────

@router.delete("/invitations/{inv_id}", status_code=204)
def cancel_invitation(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    inv = team_service.get_invitation(db, inv_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    team = team_service.get_team_by_id(db, inv.team_id)
    if not team or (team.leader_id != current_user.user_id and current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this invitation")

    if inv.status != "pending":
        raise HTTPException(status_code=409, detail="Can only delete pending invitations")

    db.delete(inv)
    db.commit()
