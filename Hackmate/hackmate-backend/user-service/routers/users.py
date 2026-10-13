from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, CurrentUser
from schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserListResponse,
    SkillResponse, UserSkillAdd, UserSkillResponse, PasswordResetByAdmin,
)
from services import user_service
from services.cache_service import cache_service

router = APIRouter()

VALID_ROLES = {"admin", "mentor", "participant", "volunteer"}
VALID_PROFICIENCY = {"beginner", "intermediate", "advanced", "expert"}


class RoleUpdate(BaseModel):
    role: str


# ── List users (admin only) ────────────────────────────────────────────────

@router.get("/", response_model=UserListResponse)
def list_users(
    role: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    total, users = user_service.get_all_users(db, role=role, search=search, skip=skip, limit=limit)
    return UserListResponse(total=total, users=users)


# ── Get current user profile ───────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def get_me(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    key = f"hackmate:user:v1:{current_user.user_id}"
    cached = cache_service.get_json(key)
    if cached is not None:
        return cached

    user = user_service.get_user_by_id(db, current_user.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = UserResponse.model_validate(user).model_dump(mode="json")
    cache_service.set_json(key, data, ttl_seconds=300)
    return user



# ── Search users (for team invitations etc.) ──────────────────────────────

@router.get("/search", response_model=UserListResponse)
def search_users(
    q: str | None = Query(None),
    tech: str | None = Query(None),
    role: str | None = Query(None),
    exclude_in_team: bool = Query(False),
    team_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from sqlalchemy import text, or_
    from models.user import User as UserModel

    query = db.query(UserModel).filter(UserModel.role == (role or "participant"))
    query = query.filter(UserModel.id != current_user.user_id)

    if q:
        pattern = f"%{q}%"
        query = query.filter(
            or_(UserModel.name.ilike(pattern), UserModel.email.ilike(pattern))
        )

    if tech:
        query = query.filter(UserModel.tech_stack.ilike(f"%{tech}%"))

    users = query.order_by(UserModel.name).limit(50).all()

    # Build lookup sets
    in_team_ids: set[int] = {
        row[0] for row in db.execute(text(
            "SELECT DISTINCT user_id FROM team_members WHERE status='approved'"
        )).fetchall()
    }

    pending_invite_ids: set[int] = set()
    if team_id:
        pending_invite_ids = {
            row[0] for row in db.execute(text(
                "SELECT to_user_id FROM team_invitations WHERE team_id=:tid AND status='pending'"
            ), {"tid": team_id}).fetchall()
        }

    if exclude_in_team:
        users = [u for u in users if u.id not in in_team_ids]

    # Build response dicts manually to include enriched fields
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "tech_stack": u.tech_stack,
            "floor": u.floor,
            "room": u.room,
            "created_at": u.created_at,
            "in_team": 1 if u.id in in_team_ids else 0,
            "has_pending_invite": 1 if u.id in pending_invite_ids else 0,
        })

    return {"total": len(result), "users": result}


# ── Get user by ID ─────────────────────────────────────────────────────────

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # Users can view their own profile; admins can view anyone
    if current_user.role != "admin" and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    key = f"hackmate:user:v1:{user_id}"
    cached = cache_service.get_json(key)
    if cached is not None:
        return cached

    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = UserResponse.model_validate(user).model_dump(mode="json")
    cache_service.set_json(key, data, ttl_seconds=300)
    return user



# ── Create user (admin only) ───────────────────────────────────────────────

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {payload.role}")

    if user_service.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=409, detail="Email already registered")

    return user_service.create_user(db, payload)


# ── Update user profile ────────────────────────────────────────────────────

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user_service.update_user(db, user, payload)


# ── Delete user (admin only) ───────────────────────────────────────────────

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_service.delete_user(db, user)


# ── Admin reset password ───────────────────────────────────────────────────

@router.put("/{user_id}/role", status_code=status.HTTP_200_OK)
def update_role(
    user_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {payload.role}")

    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = payload.role
    db.commit()
    db.refresh(user)
    cache_service.delete(f"hackmate:user:v1:{user_id}")
    return user



# ── Admin reset password ───────────────────────────────────────────────────

@router.put("/{user_id}/password", status_code=status.HTTP_200_OK)
def reset_password(
    user_id: int,
    payload: PasswordResetByAdmin,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_service.reset_password(db, user, payload.new_password)
    return {"message": "Password reset successfully"}


# ── Skills catalog ─────────────────────────────────────────────────────────

@router.get("/skills/all", response_model=list[SkillResponse])
def list_skills(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return user_service.get_all_skills(db)


# ── User skills ────────────────────────────────────────────────────────────

@router.get("/{user_id}/skills", response_model=list[UserSkillResponse])
def get_user_skills(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rows = user_service.get_user_skills(db, user_id)
    return [
        UserSkillResponse(
            id=us.id,
            skill_id=skill.id,
            skill_name=skill.name,
            category=skill.category,
            proficiency_level=us.proficiency_level,
        )
        for us, skill in rows
    ]


@router.post("/{user_id}/skills", response_model=UserSkillResponse, status_code=201)
def add_skill(
    user_id: int,
    payload: UserSkillAdd,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if payload.proficiency_level not in VALID_PROFICIENCY:
        raise HTTPException(status_code=400, detail="Invalid proficiency level")

    us = user_service.add_user_skill(db, user_id, payload.skill_id, payload.proficiency_level)
    from models.user import Skill
    skill = db.query(Skill).filter_by(id=us.skill_id).first()
    return UserSkillResponse(
        id=us.id,
        skill_id=skill.id,
        skill_name=skill.name,
        category=skill.category,
        proficiency_level=us.proficiency_level,
    )


@router.delete("/{user_id}/skills/{skill_id}", status_code=204)
def remove_skill(
    user_id: int,
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    removed = user_service.remove_user_skill(db, user_id, skill_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Skill not found for this user")
