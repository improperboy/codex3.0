from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from models.team import Team, TeamMember, TeamInvitation, TeamSkillRequirement, Theme
from models.join_request import JoinRequest
from schemas.team import TeamCreate, TeamUpdate
from config import settings
from services.cache_service import cache_service

KEY_THEMES = "hackmate:themes:v1"


# ── Admin settings helpers ─────────────────────────────────────────────────

def _get_int_setting(db: Session, key: str, fallback: int) -> int:
    """Read an integer value from system_settings, falling back to a default."""
    try:
        row = db.execute(
            text("SELECT setting_value FROM system_settings WHERE setting_key = :k"),
            {"k": key},
        ).fetchone()
        if row and row[0] is not None:
            return int(row[0])
    except Exception:
        pass
    return fallback


def get_max_team_size(db: Session) -> int:
    return _get_int_setting(db, "max_team_size", settings.max_team_size)


def get_min_team_size(db: Session) -> int:
    return _get_int_setting(db, "min_team_size", 2)


# ── Themes ─────────────────────────────────────────────────────────────────

def get_themes(db: Session):
    cached = cache_service.get_json(KEY_THEMES)
    if cached is not None:
        return cached
    themes = db.query(Theme).filter(Theme.is_active == 1).all()
    data = [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "color_code": t.color_code,
            "is_active": t.is_active,
        }
        for t in themes
    ]
    cache_service.set_json(KEY_THEMES, data, ttl_seconds=3600)
    return themes



# ── Teams ──────────────────────────────────────────────────────────────────

def get_team_by_id(db: Session, team_id: int) -> Team | None:
    return db.query(Team).filter(Team.id == team_id).first()


def get_teams(
    db: Session,
    status: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
    allowed_statuses: list[str] | None = None,
) -> tuple[int, list[Team]]:
    q = db.query(Team)
    if status:
        q = q.filter(Team.status == status)
    elif allowed_statuses:
        q = q.filter(Team.status.in_(allowed_statuses))
    if search:
        q = q.filter(Team.name.ilike(f"%{search}%"))
    total = q.count()
    teams = q.order_by(Team.created_at.desc()).offset(skip).limit(limit).all()
    return total, teams


def get_user_team(db: Session, user_id: int) -> Team | None:
    member = (
        db.query(TeamMember)
        .filter(TeamMember.user_id == user_id, TeamMember.status == "approved")
        .first()
    )
    if not member:
        return None
    return get_team_by_id(db, member.team_id)


def get_member_count(db: Session, team_id: int) -> int:
    return (
        db.query(func.count(TeamMember.id))
        .filter(TeamMember.team_id == team_id, TeamMember.status == "approved")
        .scalar()
    )


def create_team(db: Session, payload: TeamCreate, leader_id: int) -> Team:
    # Validate theme is active
    if payload.theme_id:
        theme = db.query(Theme).filter(Theme.id == payload.theme_id, Theme.is_active == 1).first()
        if not theme:
            raise ValueError("Selected theme is not active or does not exist")

    team = Team(
        name=payload.name,
        idea=payload.idea,
        problem_statement=payload.problem_statement,
        tech_skills=payload.tech_skills,
        theme_id=payload.theme_id,
        leader_id=leader_id,
        status="draft",
    )
    db.add(team)
    db.flush()  # get team.id before commit

    # Add leader as first member
    member = TeamMember(user_id=leader_id, team_id=team.id, status="approved")
    db.add(member)

    # Cancel all pending join requests for this user
    db.query(JoinRequest).filter(
        JoinRequest.user_id == leader_id,
        JoinRequest.status == "pending",
    ).update({"status": "expired"})

    db.commit()
    db.refresh(team)
    return team


def has_pending_join_requests(db: Session, user_id: int) -> bool:
    return db.query(JoinRequest).filter(
        JoinRequest.user_id == user_id,
        JoinRequest.status == "pending",
    ).count() > 0


def has_any_team_as_leader(db: Session, user_id: int) -> bool:
    """Prevent creating a second team even if first was rejected."""
    return db.query(Team).filter(Team.leader_id == user_id).count() > 0


def update_team(db: Session, team: Team, payload: TeamUpdate) -> Team:
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    cache_service.delete(f"hackmate:team:v1:{team.id}")
    return team


def update_team_status(
    db: Session, team: Team, status: str,
    floor_id: int | None = None, room_id: int | None = None,
) -> Team:
    team.status = status
    if floor_id:
        team.floor_id = floor_id
    if room_id:
        team.room_id = room_id
    db.commit()
    db.refresh(team)
    cache_service.delete(f"hackmate:team:v1:{team.id}")
    return team


def delete_team(db: Session, team: Team) -> None:
    from sqlalchemy import text

    team_id = team.id
    # Clean up foreign-key-dependent rows that don't have ON DELETE CASCADE
    try:
        db.execute(text("DELETE FROM team_members WHERE team_id = :tid"), {"tid": team.id})
    except Exception:
        db.rollback()

    try:
        db.execute(text("DELETE FROM team_invitations WHERE team_id = :tid"), {"tid": team.id})
    except Exception:
        db.rollback()

    try:
        db.execute(text("DELETE FROM join_requests WHERE team_id = :tid"), {"tid": team.id})
    except Exception:
        db.rollback()

    try:
        db.execute(text("DELETE FROM mentor_assignments WHERE team_id = :tid"), {"tid": team.id})
    except Exception:
        db.rollback()

    try:
        db.execute(text("DELETE FROM scores WHERE team_id = :tid"), {"tid": team.id})
    except Exception:
        db.rollback()

    try:
        db.execute(text("DELETE FROM submissions WHERE team_id = :tid"), {"tid": team.id})
    except Exception:
        db.rollback()

    db.delete(team)
    db.commit()
    cache_service.delete(f"hackmate:team:v1:{team_id}")


def remove_member(db: Session, team_id: int, user_id: int) -> bool:
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id,
    ).first()
    if not member:
        return False
    db.delete(member)
    db.commit()
    return True


def get_team_members(db: Session, team_id: int) -> list[TeamMember]:
    return (
        db.query(TeamMember)
        .filter(TeamMember.team_id == team_id, TeamMember.status == "approved")
        .all()
    )


# ── Join Requests ──────────────────────────────────────────────────────────

def get_join_request(db: Session, request_id: int) -> JoinRequest | None:
    return db.query(JoinRequest).filter(JoinRequest.id == request_id).first()


def get_pending_request(db: Session, user_id: int, team_id: int) -> JoinRequest | None:
    return db.query(JoinRequest).filter(
        JoinRequest.user_id == user_id,
        JoinRequest.team_id == team_id,
        JoinRequest.status == "pending",
    ).first()


def get_user_join_requests(db: Session, user_id: int) -> list[JoinRequest]:
    return (
        db.query(JoinRequest)
        .filter(JoinRequest.user_id == user_id)
        .order_by(JoinRequest.created_at.desc())
        .all()
    )


def get_team_join_requests(db: Session, team_id: int, status: str | None = None):
    q = db.query(JoinRequest).filter(JoinRequest.team_id == team_id)
    if status:
        q = q.filter(JoinRequest.status == status)
    return q.order_by(JoinRequest.created_at.desc()).all()


def create_join_request(db: Session, user_id: int, team_id: int, message: str | None) -> JoinRequest:
    jr = JoinRequest(user_id=user_id, team_id=team_id, message=message, status="pending")
    db.add(jr)
    db.commit()
    db.refresh(jr)
    return jr


def respond_join_request(db: Session, jr: JoinRequest, status: str, team: Team) -> JoinRequest:
    jr.status = status
    jr.responded_at = datetime.now(timezone.utc)

    if status == "approved":
        max_size = get_max_team_size(db)
        current_count = get_member_count(db, jr.team_id)
        if current_count >= max_size:
            db.rollback()
            raise ValueError(f"Team is already at maximum capacity ({max_size} members)")

        member = TeamMember(user_id=jr.user_id, team_id=jr.team_id, status="approved")
        db.add(member)

        # Cancel all other pending join requests for this user
        db.query(JoinRequest).filter(
            JoinRequest.user_id == jr.user_id,
            JoinRequest.status == "pending",
            JoinRequest.id != jr.id,
        ).update({"status": "expired"})

        # Cancel all pending invitations to this user
        db.query(TeamInvitation).filter(
            TeamInvitation.to_user_id == jr.user_id,
            TeamInvitation.status == "pending",
        ).update({"status": "expired"})

        # If team is now full, expire remaining pending requests and invitations for this team
        if current_count + 1 >= max_size:
            db.query(JoinRequest).filter(
                JoinRequest.team_id == jr.team_id,
                JoinRequest.status == "pending",
                JoinRequest.id != jr.id,
            ).update({"status": "expired"})

            db.query(TeamInvitation).filter(
                TeamInvitation.team_id == jr.team_id,
                TeamInvitation.status == "pending",
            ).update({"status": "expired"})

    db.commit()
    db.refresh(jr)
    if status == "approved":
        cache_service.delete(f"hackmate:team:v1:{jr.team_id}")
    return jr


# ── Invitations ────────────────────────────────────────────────────────────

def get_invitation(db: Session, inv_id: int) -> TeamInvitation | None:
    return db.query(TeamInvitation).filter(TeamInvitation.id == inv_id).first()


def get_pending_invitation_count(db: Session, team_id: int) -> int:
    return (
        db.query(func.count(TeamInvitation.id))
        .filter(TeamInvitation.team_id == team_id, TeamInvitation.status == "pending")
        .scalar() or 0
    )


def get_pending_invitation(db: Session, team_id: int, to_user_id: int) -> TeamInvitation | None:
    return db.query(TeamInvitation).filter(
        TeamInvitation.team_id == team_id,
        TeamInvitation.to_user_id == to_user_id,
        TeamInvitation.status == "pending",
    ).first()


def get_user_invitations(db: Session, user_id: int) -> list[TeamInvitation]:
    return (
        db.query(TeamInvitation)
        .filter(TeamInvitation.to_user_id == user_id, TeamInvitation.status == "pending")
        .order_by(TeamInvitation.created_at.desc())
        .all()
    )


def get_team_sent_invitations(db: Session, team_id: int) -> list[TeamInvitation]:
    from sqlalchemy import text
    # Join with users to get the to_user_name
    rows = db.execute(text("""
        SELECT ti.id, ti.team_id, ti.from_user_id, ti.to_user_id, ti.message, ti.status, ti.created_at, ti.responded_at, u.name as to_user_name
        FROM team_invitations ti
        JOIN users u ON ti.to_user_id = u.id
        WHERE ti.team_id = :team_id
        ORDER BY ti.created_at DESC
    """), {"team_id": team_id}).fetchall()
    
    # We can just return rows if the response model supports it or mock InvitationResponse
    # wait, TeamInvitation objects are usually expected.
    # The current code uses a Pydantic model for InvitationResponse.
    # We'll just return the query and let the router format it. No, InvitationResponse allows extra fields if `from_attributes=True`? Let's just return TeamInvitation objects and attach to_user_name.
    
    invites = db.query(TeamInvitation).filter(TeamInvitation.team_id == team_id).order_by(TeamInvitation.created_at.desc()).all()
    for inv in invites:
        u_row = db.execute(text("SELECT name FROM users WHERE id = :uid"), {"uid": inv.to_user_id}).fetchone()
        if u_row:
            inv.to_user_name = u_row[0]
            # using to_user_name dynamically. Currently InvitationResponse might not expose to_user_name. 
            # We can use `from_user_name` temporarily for the UI, or just return basic.
    return invites

def create_invitation(
    db: Session, team_id: int, from_user_id: int, to_user_id: int, message: str | None
) -> TeamInvitation:
    inv = TeamInvitation(
        team_id=team_id,
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        message=message,
        status="pending",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


def respond_invitation(db: Session, inv: TeamInvitation, status: str) -> TeamInvitation:
    inv.status = status
    inv.responded_at = datetime.now(timezone.utc)

    if status == "accepted":
        max_size = get_max_team_size(db)
        current_count = get_member_count(db, inv.team_id)
        if current_count >= max_size:
            db.rollback()
            raise ValueError(f"Team is already at maximum capacity ({max_size} members)")

        member = TeamMember(user_id=inv.to_user_id, team_id=inv.team_id, status="approved")
        db.add(member)

        # Cancel all other pending invitations for this user
        db.query(TeamInvitation).filter(
            TeamInvitation.to_user_id == inv.to_user_id,
            TeamInvitation.status == "pending",
            TeamInvitation.id != inv.id,
        ).update({"status": "expired"})

        # Cancel all pending join requests from this user
        db.query(JoinRequest).filter(
            JoinRequest.user_id == inv.to_user_id,
            JoinRequest.status == "pending",
        ).update({"status": "expired"})

        # If team is now full, expire remaining pending requests and invitations for this team
        if current_count + 1 >= max_size:
            db.query(TeamInvitation).filter(
                TeamInvitation.team_id == inv.team_id,
                TeamInvitation.status == "pending",
                TeamInvitation.id != inv.id,
            ).update({"status": "expired"})

            db.query(JoinRequest).filter(
                JoinRequest.team_id == inv.team_id,
                JoinRequest.status == "pending",
            ).update({"status": "expired"})

    db.commit()
    db.refresh(inv)
    if status == "accepted":
        cache_service.delete(f"hackmate:team:v1:{inv.team_id}")
    return inv

