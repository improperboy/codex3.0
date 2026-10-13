from datetime import datetime
import time
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from models.round import MentoringRound
from models.score import Score
from schemas.round import RoundCreate, RoundUpdate
from schemas.score import ScoreSubmit, ScoreUpdate
from services.cache_service import cache_service

# ── Versioned Cache Keys ───────────────────────────────────────────────────
KEY_RANKINGS = "hackmate:leaderboard:v1:rankings"
LOCK_RANKINGS = "hackmate:lock:leaderboard:v1:rankings"
KEY_ACTIVE_ROUNDS = "hackmate:rounds:v1:active"


# ── Rounds ─────────────────────────────────────────────────────────────────

def get_all_rounds(db: Session) -> list[MentoringRound]:
    return db.query(MentoringRound).order_by(MentoringRound.start_time).all()


def get_active_rounds(db: Session) -> list[MentoringRound]:
    # Check cache for active round IDs
    cached_ids = cache_service.get_json(KEY_ACTIVE_ROUNDS)
    if cached_ids is not None:
        if not cached_ids:
            return []
        return db.query(MentoringRound).filter(MentoringRound.id.in_(cached_ids)).all()

    # Use DB-side NOW() so there's no server/DB timezone mismatch
    from sqlalchemy import text as sa_text
    rows = db.execute(sa_text("""
        SELECT id FROM mentoring_rounds
        WHERE is_active = 1
          AND start_time <= NOW()
          AND end_time >= NOW()
    """)).fetchall()
    ids = [r[0] for r in rows]
    cache_service.set_json(KEY_ACTIVE_ROUNDS, ids, ttl_seconds=60)
    if not ids:
        return []
    return db.query(MentoringRound).filter(MentoringRound.id.in_(ids)).all()


def get_round_by_id(db: Session, round_id: int) -> MentoringRound | None:
    return db.query(MentoringRound).filter(MentoringRound.id == round_id).first()


def create_round(db: Session, payload: RoundCreate) -> MentoringRound:
    r = MentoringRound(
        round_name=payload.round_name,
        start_time=payload.start_time,
        end_time=payload.end_time,
        max_score=payload.max_score,
        description=payload.description,
        is_active=1,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    cache_service.delete_keys(KEY_ACTIVE_ROUNDS, KEY_RANKINGS)
    return r


def update_round(db: Session, r: MentoringRound, payload: RoundUpdate) -> MentoringRound:
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    cache_service.delete_keys(KEY_ACTIVE_ROUNDS, KEY_RANKINGS)
    return r


def delete_round(db: Session, r: MentoringRound) -> None:
    db.delete(r)
    db.commit()
    cache_service.delete_keys(KEY_ACTIVE_ROUNDS, KEY_RANKINGS)


def is_round_ongoing(r: MentoringRound) -> bool:
    # Use local naive time — matches how DB stores datetimes (no timezone offset)
    now = datetime.now()
    return r.is_active == 1 and r.start_time <= now <= r.end_time


def is_mentor_assigned_to_team(db: Session, mentor_id: int, team_id: int) -> bool:
    """Check mentor has an assignment matching the team's floor/room."""
    result = db.execute(text("""
        SELECT COUNT(*) FROM mentor_assignments ma
        JOIN teams t ON t.floor_id = ma.floor_id AND t.room_id = ma.room_id
        WHERE ma.mentor_id = :mentor_id AND t.id = :team_id
    """), {"mentor_id": mentor_id, "team_id": team_id}).scalar()
    return (result or 0) > 0


# ── Scores ─────────────────────────────────────────────────────────────────

def get_score(db: Session, score_id: int) -> Score | None:
    return db.query(Score).filter(Score.id == score_id).first()


def get_existing_score(db: Session, mentor_id: int, team_id: int, round_id: int) -> Score | None:
    return db.query(Score).filter(
        Score.mentor_id == mentor_id,
        Score.team_id == team_id,
        Score.round_id == round_id,
    ).first()


def get_scores_by_team(db: Session, team_id: int) -> list[Score]:
    return (
        db.query(Score)
        .filter(Score.team_id == team_id)
        .order_by(Score.round_id)
        .all()
    )


def get_scores_by_round(db: Session, round_id: int) -> list[Score]:
    return db.query(Score).filter(Score.round_id == round_id).all()


def get_scores_by_mentor(db: Session, mentor_id: int) -> list[Score]:
    return (
        db.query(Score)
        .filter(Score.mentor_id == mentor_id)
        .order_by(Score.created_at.desc())
        .all()
    )


def submit_score(db: Session, mentor_id: int, payload: ScoreSubmit) -> Score:
    existing = get_existing_score(db, mentor_id, payload.team_id, payload.round_id)
    if existing:
        existing.score = payload.score
        existing.comment = payload.comment
        db.commit()
        db.refresh(existing)
        cache_service.delete(KEY_RANKINGS)
        return existing

    s = Score(
        mentor_id=mentor_id,
        team_id=payload.team_id,
        round_id=payload.round_id,
        score=payload.score,
        comment=payload.comment,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    cache_service.delete(KEY_RANKINGS)
    return s


def update_score(db: Session, s: Score, payload: ScoreUpdate) -> Score:
    s.score = payload.score
    if payload.comment is not None:
        s.comment = payload.comment
    db.commit()
    db.refresh(s)
    cache_service.delete(KEY_RANKINGS)
    return s


def delete_score(db: Session, s: Score) -> None:
    db.delete(s)
    db.commit()
    cache_service.delete(KEY_RANKINGS)


# ── Rankings ───────────────────────────────────────────────────────────────

def _query_rankings_from_db(db: Session) -> list[dict]:
    """Execute the multi-table join and aggregate query for leaderboard rankings."""
    from sqlalchemy import text as sa_text
    rows = db.execute(sa_text("""
        SELECT
            t.id            AS team_id,
            t.name          AS team_name,
            u.name          AS leader_name,
            f.floor_number  AS floor_number,
            r.room_number   AS room_number,
            COUNT(DISTINCT s.round_id) AS rounds_participated,
            COUNT(s.id)     AS scores_count,
            ROUND(AVG(s.score), 2) AS average_score,
            ROUND(SUM(s.score), 2) AS total_score
        FROM scores s
        JOIN teams t ON t.id = s.team_id
        LEFT JOIN users u ON u.id = t.leader_id
        LEFT JOIN floors f ON f.id = t.floor_id
        LEFT JOIN rooms r ON r.id = t.room_id
        GROUP BY t.id, t.name, u.name, f.floor_number, r.room_number
        ORDER BY average_score DESC
    """)).fetchall()

    result = []
    for i, row in enumerate(rows):
        result.append({
            "rank": i + 1,
            "team_id": row[0],
            "team_name": row[1] or f"Team {row[0]}",
            "leader_name": row[2] or "—",
            "floor_number": row[3],
            "room_number": row[4],
            "rounds_participated": row[5],
            "scores_count": row[6],
            "average_score": float(row[7]) if row[7] is not None else 0.0,
            "total_score": float(row[8]) if row[8] is not None else 0.0,
        })
    return result


def get_rankings(db: Session) -> list[dict]:
    """
    Returns teams ranked by average score across all rounds.
    Utilizes Redis cache with stampede lock protection and fail-open DB fallback.
    """
    # 1. Read-through cache check
    cached = cache_service.get_json(KEY_RANKINGS)
    if cached is not None:
        return cached

    # 2. Acquire stampede lock to avoid concurrent dog-piling
    token = cache_service.acquire_lock(LOCK_RANKINGS, ttl_seconds=5)
    if not token:
        # Another worker is computing rankings — sleep 100ms and re-check cache
        time.sleep(0.1)
        cached = cache_service.get_json(KEY_RANKINGS)
        if cached is not None:
            return cached
        # If still None, execute query directly (fail-open)
        return _query_rankings_from_db(db)

    try:
        rankings = _query_rankings_from_db(db)
        cache_service.set_json(KEY_RANKINGS, rankings, ttl_seconds=30)
        return rankings
    finally:
        cache_service.release_lock(LOCK_RANKINGS, token)

