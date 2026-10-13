from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, CurrentUser
from schemas.round import RoundCreate, RoundUpdate, RoundResponse
from services import scoring_service

router = APIRouter()


@router.get("/", response_model=list[RoundResponse])
def list_rounds(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rounds = scoring_service.get_all_rounds(db)
    for r in rounds:
        r.is_ongoing = scoring_service.is_round_ongoing(r)
    return rounds


@router.get("/active", response_model=list[RoundResponse])
def active_rounds(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rounds = scoring_service.get_active_rounds(db)
    for r in rounds:
        r.is_ongoing = True
    return rounds


@router.get("/{round_id}", response_model=RoundResponse)
def get_round(
    round_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    r = scoring_service.get_round_by_id(db, round_id)
    if not r:
        raise HTTPException(status_code=404, detail="Round not found")
    r.is_ongoing = scoring_service.is_round_ongoing(r)
    return r


@router.post("/", response_model=RoundResponse, status_code=status.HTTP_201_CREATED)
def create_round(
    payload: RoundCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    return scoring_service.create_round(db, payload)


@router.put("/{round_id}", response_model=RoundResponse)
def update_round(
    round_id: int,
    payload: RoundUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    r = scoring_service.get_round_by_id(db, round_id)
    if not r:
        raise HTTPException(status_code=404, detail="Round not found")

    return scoring_service.update_round(db, r, payload)


@router.delete("/{round_id}", status_code=204)
def delete_round(
    round_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    r = scoring_service.get_round_by_id(db, round_id)
    if not r:
        raise HTTPException(status_code=404, detail="Round not found")

    scoring_service.delete_round(db, r)
