from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.database import get_db
from dependencies import get_current_user, CurrentUser
from schemas.score import RankingsResponse
from services import scoring_service

router = APIRouter()


@router.get("/", response_model=RankingsResponse)
def get_rankings(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # Admins and mentors always see rankings; participants and volunteers respect the setting
    if current_user.role not in ("admin", "mentor"):
        row = db.execute(text(
            "SELECT setting_value FROM system_settings WHERE setting_key = 'rankings_visible'"
        )).fetchone()
        visible = row and row[0] in ("1", "true")
        if not visible:
            raise HTTPException(status_code=403, detail="Rankings are not visible yet")

    rankings = scoring_service.get_rankings(db)
    return RankingsResponse(rankings=rankings)
