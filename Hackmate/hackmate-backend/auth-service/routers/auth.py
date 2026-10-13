from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from db.database import get_db
from models.user import User
from schemas.auth import (
    LoginRequest, RegisterRequest, TokenResponse,
    RefreshRequest, ChangePasswordRequest, MeResponse,
)
from services.jwt_service import create_access_token, create_refresh_token, decode_token
from services.password_service import hash_password, verify_password
from dependencies import get_current_user

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token_data = {"sub": str(user.id), "role": user.role, "name": user.name}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        role=user.role,
        name=user.name,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if payload.role not in ("participant", "mentor", "volunteer"):
        raise HTTPException(status_code=400, detail="Invalid role for self-registration")

    # Check if registration is open
    from sqlalchemy import text
    reg_setting = db.execute(
        text("SELECT setting_value FROM system_settings WHERE setting_key = 'registration_open'")
    ).scalar()
    if reg_setting is not None and reg_setting.lower() in ("false", "0", "no"):
        raise HTTPException(status_code=403, detail="Registration is currently closed")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token_data = {"sub": str(user.id), "role": user.role, "name": user.name}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        role=user.role,
        name=user.name,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == int(data["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    token_data = {"sub": str(user.id), "role": user.role, "name": user.name}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user_id=user.id,
        role=user.role,
        name=user.name,
    )


@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user)):
    # Revoke the current access token so it can't be reused after logout
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        payload = decode_token(token)
        if payload:
            from services.blacklist_service import revoke_token
            import time
            jti = payload.get("jti")
            ttl = max(int(payload.get("exp", 0) - time.time()), 0)
            if jti and ttl > 0:
                revoke_token(jti, ttl)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
