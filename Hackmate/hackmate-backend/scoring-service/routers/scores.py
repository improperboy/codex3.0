from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, CurrentUser
from schemas.score import ScoreSubmit, ScoreUpdate, ScoreResponse, RankingsResponse
from services import scoring_service

router = APIRouter()


@router.post("/", response_model=ScoreResponse, status_code=status.HTTP_201_CREATED)
def submit_score(
    payload: ScoreSubmit,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role not in ("mentor", "admin"):
        raise HTTPException(status_code=403, detail="Only mentors or admins can submit scores")

    # Validate round exists and is ongoing
    r = scoring_service.get_round_by_id(db, payload.round_id)
    if not r:
        raise HTTPException(status_code=404, detail="Round not found")
    if not scoring_service.is_round_ongoing(r):
        raise HTTPException(status_code=409, detail="Round is not currently active")

    # Validate score within max
    if payload.score < 0 or payload.score > r.max_score:
        raise HTTPException(
            status_code=400,
            detail=f"Score must be between 0 and {r.max_score}",
        )

    # Mentors can only score teams in their assigned floor/room (admin bypasses)
    if current_user.role == "mentor":
        if not scoring_service.is_mentor_assigned_to_team(db, current_user.user_id, payload.team_id):
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this team's location",
            )

    return scoring_service.submit_score(db, current_user.user_id, payload)


@router.get("/team/{team_id}", response_model=list[ScoreResponse])
def scores_for_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return scoring_service.get_scores_by_team(db, team_id)


@router.get("/round/{round_id}", response_model=list[ScoreResponse])
def scores_for_round(
    round_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role not in ("mentor", "admin"):
        raise HTTPException(status_code=403, detail="Mentor or admin access required")
    return scoring_service.get_scores_by_round(db, round_id)


@router.get("/mine", response_model=list[ScoreResponse])
def my_scores(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role not in ("mentor", "admin"):
        raise HTTPException(status_code=403, detail="Mentor or admin access required")
    return scoring_service.get_scores_by_mentor(db, current_user.user_id)


@router.get("/{score_id}", response_model=ScoreResponse)
def get_score(
    score_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    s = scoring_service.get_score(db, score_id)
    if not s:
        raise HTTPException(status_code=404, detail="Score not found")
    if current_user.role not in ("mentor", "admin") and s.mentor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return s


@router.put("/{score_id}", response_model=ScoreResponse)
def update_score(
    score_id: int,
    payload: ScoreUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    s = scoring_service.get_score(db, score_id)
    if not s:
        raise HTTPException(status_code=404, detail="Score not found")

    if s.mentor_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Can only update your own scores")

    r = scoring_service.get_round_by_id(db, s.round_id)
    if not scoring_service.is_round_ongoing(r) and current_user.role != "admin":
        raise HTTPException(status_code=409, detail="Round has ended, score cannot be updated")

    if payload.score < 0 or payload.score > r.max_score:
        raise HTTPException(status_code=400, detail=f"Score must be between 0 and {r.max_score}")

    return scoring_service.update_score(db, s, payload)


@router.delete("/{score_id}", status_code=204)
def delete_score(
    score_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    s = scoring_service.get_score(db, score_id)
    if not s:
        raise HTTPException(status_code=404, detail="Score not found")

    scoring_service.delete_score(db, s)


@router.get("/team/{team_id}/mentoring-summary")
def team_mentoring_summary(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Returns all mentoring rounds with assigned mentor info, feedback/comments,
    and scores (scores only included if show_mentoring_scores_to_participants = 1).
    Accessible by participants, mentors, and admins.
    """
    from sqlalchemy import text

    # Check if scores should be visible to participants
    show_scores_row = db.execute(text(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'show_mentoring_scores_to_participants'"
    )).fetchone()
    show_scores = show_scores_row and show_scores_row[0] == "1"

    # Get all rounds
    rounds = scoring_service.get_all_rounds(db)

    result = []
    for r in rounds:
        # Get scores for this team in this round
        scores = db.execute(text("""
            SELECT s.id, s.mentor_id, s.score, s.comment, s.created_at, s.updated_at,
                   u.name as mentor_name
            FROM scores s
            LEFT JOIN users u ON u.id = s.mentor_id
            WHERE s.team_id = :team_id AND s.round_id = :round_id
        """), {"team_id": team_id, "round_id": r.id}).fetchall()

        # Get assigned mentors for this team's location
        assigned_mentors = db.execute(text("""
            SELECT DISTINCT u.id, u.name, u.email
            FROM mentor_assignments ma
            JOIN teams t ON t.floor_id = ma.floor_id AND t.room_id = ma.room_id
            JOIN users u ON u.id = ma.mentor_id
            WHERE t.id = :team_id
        """), {"team_id": team_id}).fetchall()

        feedback_list = []
        for s in scores:
            entry = {
                "id": s[0],
                "mentor_id": s[1],
                "mentor_name": s[6] or f"Mentor #{s[1]}",
                "comment": s[3],
                "created_at": s[4].isoformat() if s[4] else None,
            }
            if show_scores or current_user.role in ("mentor", "admin"):
                entry["score"] = s[2]
                entry["max_score"] = r.max_score
            feedback_list.append(entry)

        result.append({
            "id": r.id,
            "round_name": r.round_name,
            "description": r.description,
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
            "max_score": r.max_score,
            "is_active": r.is_active,
            "is_ongoing": scoring_service.is_round_ongoing(r),
            "assigned_mentors": [
                {"id": m[0], "name": m[1], "email": m[2]} for m in assigned_mentors
            ],
            "feedback": feedback_list,
            "scores_visible": show_scores or current_user.role in ("mentor", "admin"),
        })

    return result


@router.get("/rankings/all", response_model=RankingsResponse)
def get_rankings(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rankings = scoring_service.get_rankings(db)
    return RankingsResponse(rankings=rankings)


@router.get("/team/{team_id}/progress")
def team_score_progress(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Score progression across rounds for a single team."""
    from sqlalchemy import text
    rows = db.execute(text("""
        SELECT mr.id as round_id, mr.round_name, mr.max_score,
               AVG(s.score) as avg_score, COUNT(s.id) as mentor_count
        FROM scores s
        JOIN mentoring_rounds mr ON s.round_id = mr.id
        WHERE s.team_id = :tid
        GROUP BY s.round_id, mr.round_name, mr.max_score
        ORDER BY mr.start_time
    """), {"tid": team_id}).fetchall()

    return {
        "team_id": team_id,
        "rounds": [
            {
                "round_id": r[0],
                "round_name": r[1],
                "max_score": r[2],
                "avg_score": round(float(r[3]), 2),
                "mentor_count": r[4],
                "percentage": round((float(r[3]) / r[2]) * 100, 1) if r[2] else 0,
            }
            for r in rows
        ],
        "overall_avg": round(
            sum(float(r[3]) for r in rows) / len(rows), 2
        ) if rows else 0,
    }
