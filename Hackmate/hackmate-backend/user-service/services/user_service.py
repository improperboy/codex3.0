import bcrypt
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models.user import User, Skill, UserSkill
from schemas.user import UserCreate, UserUpdate
from services.cache_service import cache_service

KEY_SKILLS = "hackmate:skills:v1:all"


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_all_users(
    db: Session,
    role: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[int, list[User]]:
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(User.name.ilike(pattern), User.email.ilike(pattern))
        )

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return total, users


def create_user(db: Session, payload: UserCreate) -> User:
    user = User(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
        role=payload.role,
        tech_stack=payload.tech_stack,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, payload: UserUpdate) -> User:
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    cache_service.delete(f"hackmate:user:v1:{user.id}")
    return user


def delete_user(db: Session, user: User) -> None:
    uid = user.id
    db.delete(user)
    db.commit()
    cache_service.delete(f"hackmate:user:v1:{uid}")


def reset_password(db: Session, user: User, new_password: str) -> None:
    user.password = hash_password(new_password)
    db.commit()
    cache_service.delete(f"hackmate:user:v1:{user.id}")


def get_all_skills(db: Session) -> list[Skill]:
    cached = cache_service.get_json(KEY_SKILLS)
    if cached is not None:
        return cached
    skills = db.query(Skill).order_by(Skill.category, Skill.name).all()
    data = [{"id": s.id, "name": s.name, "category": s.category} for s in skills]
    cache_service.set_json(KEY_SKILLS, data, ttl_seconds=3600)
    return skills


def get_user_skills(db: Session, user_id: int):
    return (
        db.query(UserSkill, Skill)
        .join(Skill, UserSkill.skill_id == Skill.id)
        .filter(UserSkill.user_id == user_id)
        .all()
    )


def add_user_skill(db: Session, user_id: int, skill_id: int, proficiency: str) -> UserSkill:
    existing = db.query(UserSkill).filter(
        UserSkill.user_id == user_id,
        UserSkill.skill_id == skill_id,
    ).first()

    if existing:
        existing.proficiency_level = proficiency
        db.commit()
        db.refresh(existing)
        cache_service.delete(f"hackmate:user:v1:{user_id}")
        return existing

    us = UserSkill(user_id=user_id, skill_id=skill_id, proficiency_level=proficiency)
    db.add(us)
    db.commit()
    db.refresh(us)
    cache_service.delete(f"hackmate:user:v1:{user_id}")
    return us


def remove_user_skill(db: Session, user_id: int, skill_id: int) -> bool:
    us = db.query(UserSkill).filter(
        UserSkill.user_id == user_id,
        UserSkill.skill_id == skill_id,
    ).first()
    if not us:
        return False
    db.delete(us)
    db.commit()
    cache_service.delete(f"hackmate:user:v1:{user_id}")
    return True

