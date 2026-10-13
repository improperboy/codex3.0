from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models.submission import Submission, SubmissionSettings, GithubRepository
from schemas.submission import SubmissionCreate, SubmissionUpdate, SubmissionSettingsUpdate
from services.cache_service import cache_service

KEY_SUBMISSION_SETTINGS = "hackmate:submission:v1:settings"


# ── Submission window ──────────────────────────────────────────────────────

def get_submission_settings(db: Session) -> SubmissionSettings | None:
    return db.query(SubmissionSettings).order_by(SubmissionSettings.id.desc()).first()


def is_submission_open(db: Session) -> bool:
    settings = get_submission_settings(db)
    if not settings or not settings.is_active:
        return False
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    return settings.start_time <= now <= settings.end_time


def update_submission_settings(
    db: Session, s: SubmissionSettings, payload: SubmissionSettingsUpdate
) -> SubmissionSettings:
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    cache_service.delete(KEY_SUBMISSION_SETTINGS)
    return s


# ── Submissions ────────────────────────────────────────────────────────────

def get_submission_by_id(db: Session, submission_id: int) -> Submission | None:
    return db.query(Submission).filter(Submission.id == submission_id).first()


def get_submission_by_team(db: Session, team_id: int) -> Submission | None:
    return db.query(Submission).filter(Submission.team_id == team_id).first()


def get_all_submissions(
    db: Session, skip: int = 0, limit: int = 50
) -> tuple[int, list[Submission]]:
    q = db.query(Submission)
    total = q.count()
    items = q.order_by(Submission.submitted_at.desc()).offset(skip).limit(limit).all()
    return total, items


def create_submission(db: Session, payload: SubmissionCreate) -> Submission:
    s = Submission(
        team_id=payload.team_id,
        github_link=payload.github_link,
        live_link=payload.live_link,
        tech_stack=payload.tech_stack,
        demo_video=payload.demo_video,
        ppt_link=payload.ppt_link,
        description=payload.description,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    cache_service.delete(f"hackmate:submission:v1:team:{s.team_id}")
    return s


def update_submission(db: Session, s: Submission, payload: SubmissionUpdate) -> Submission:
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    cache_service.delete(f"hackmate:submission:v1:team:{s.team_id}")
    return s


def delete_submission(db: Session, s: Submission) -> None:
    team_id = s.team_id
    db.delete(s)
    db.commit()
    cache_service.delete(f"hackmate:submission:v1:team:{team_id}")



# ── GitHub repository cache ────────────────────────────────────────────────

def save_github_repo(
    db: Session,
    github_url: str,
    owner: str,
    repo: str,
    submitted_by: int,
    github_data: str,
    status: str = "verified",
) -> GithubRepository:
    existing = (
        db.query(GithubRepository)
        .filter(GithubRepository.github_url == github_url)
        .first()
    )
    if existing:
        existing.status = status
        existing.github_data = github_data
        db.commit()
        db.refresh(existing)
        return existing

    gr = GithubRepository(
        github_url=github_url,
        repository_name=repo,
        repository_owner=owner,
        submitted_by=submitted_by,
        status=status,
        github_data=github_data,
    )
    db.add(gr)
    db.commit()
    db.refresh(gr)
    return gr
