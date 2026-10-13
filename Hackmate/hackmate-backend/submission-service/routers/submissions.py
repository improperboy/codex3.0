import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, CurrentUser
from schemas.submission import (
    SubmissionCreate, SubmissionUpdate, SubmissionResponse,
    SubmissionListResponse, GithubValidateRequest, GithubValidateResponse,
    SubmissionSettingsResponse, SubmissionSettingsUpdate,
)
from services import submission_service
from services.cache_service import cache_service
from services.github_validator import validate_github_repo

router = APIRouter()


# ── Submission window settings (admin) ────────────────────────────────────

@router.get("/settings", response_model=SubmissionSettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    s = submission_service.get_submission_settings(db)
    if not s:
        raise HTTPException(status_code=404, detail="Submission settings not configured")
    return s


@router.put("/settings", response_model=SubmissionSettingsResponse)
def update_settings(
    payload: SubmissionSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    s = submission_service.get_submission_settings(db)
    if not s:
        raise HTTPException(status_code=404, detail="Submission settings not found")
    return submission_service.update_submission_settings(db, s, payload)


# ── GitHub validation ──────────────────────────────────────────────────────

@router.post("/validate-github", response_model=GithubValidateResponse)
async def validate_github(
    payload: GithubValidateRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    result = await validate_github_repo(payload.github_url)
    return GithubValidateResponse(**result)


# ── List all submissions (admin/mentor) ────────────────────────────────────

@router.get("/", response_model=SubmissionListResponse)
def list_submissions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role not in ("admin", "mentor"):
        raise HTTPException(status_code=403, detail="Admin or mentor access required")
    total, items = submission_service.get_all_submissions(db, skip=skip, limit=limit)
    return SubmissionListResponse(total=total, submissions=items)


# ── Get submission by team ─────────────────────────────────────────────────

@router.get("/team/{team_id}", response_model=SubmissionResponse)
def get_by_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    key = f"hackmate:submission:v1:team:{team_id}"
    cached = cache_service.get_json(key)
    if cached is not None:
        return cached

    s = submission_service.get_submission_by_team(db, team_id)
    if not s:
        raise HTTPException(status_code=404, detail="No submission found for this team")
    data = SubmissionResponse.model_validate(s).model_dump(mode="json")
    cache_service.set_json(key, data, ttl_seconds=180)
    return s



# ── GitHub repos (admin/mentor) ────────────────────────────────────────────

@router.get("/github-repos", response_model=list[dict])
def list_github_repos(
    repo_status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role not in ("admin", "mentor"):
        raise HTTPException(status_code=403, detail="Admin or mentor access required")
    from models.submission import GithubRepository
    q = db.query(GithubRepository)
    if repo_status:
        q = q.filter(GithubRepository.status == repo_status)
    repos = q.order_by(GithubRepository.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": r.id,
            "github_url": r.github_url,
            "repository_name": r.repository_name,
            "repository_owner": r.repository_owner,
            "submitted_by": r.submitted_by,
            "status": r.status,
            "created_at": str(r.created_at) if r.created_at else None,
        }
        for r in repos
    ]


@router.put("/github-repos/{repo_id}/verify")
async def reverify_repo(
    repo_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role not in ("admin", "mentor"):
        raise HTTPException(status_code=403, detail="Admin or mentor access required")
    from models.submission import GithubRepository
    import json
    repo = db.query(GithubRepository).filter(GithubRepository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    result = await validate_github_repo(repo.github_url)
    repo.status = "verified" if result["valid"] else "invalid"
    repo.github_data = json.dumps(result)
    db.commit()
    return {"id": repo.id, "status": repo.status, "github_data": result}


# ── Get submission by ID ───────────────────────────────────────────────────

@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    s = submission_service.get_submission_by_id(db, submission_id)
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    return s


# ── Submit project ─────────────────────────────────────────────────────────

@router.post("/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_project(
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role not in ("participant", "admin"):
        raise HTTPException(status_code=403, detail="Only participants can submit projects")

    # Check submission window
    if current_user.role != "admin" and not submission_service.is_submission_open(db):
        raise HTTPException(status_code=409, detail="Submission window is not open")

    # Prevent duplicate submission per team
    existing = submission_service.get_submission_by_team(db, payload.team_id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Team already has a submission. Use PUT to update it.",
        )

    # Validate GitHub URL
    github_result = await validate_github_repo(payload.github_link)
    if not github_result["valid"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid GitHub repository: {github_result.get('error')}",
        )

    submission = submission_service.create_submission(db, payload)

    # Cache GitHub repo data
    submission_service.save_github_repo(
        db,
        github_url=payload.github_link,
        owner=github_result["owner"],
        repo=github_result["repo"],
        submitted_by=current_user.user_id,
        github_data=json.dumps(github_result),
    )

    return submission


# ── Update submission ──────────────────────────────────────────────────────

@router.put("/{submission_id}", response_model=SubmissionResponse)
async def update_submission(
    submission_id: int,
    payload: SubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    s = submission_service.get_submission_by_id(db, submission_id)
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    if current_user.role not in ("admin", "mentor") and current_user.role != "participant":
        raise HTTPException(status_code=403, detail="Access denied")

    if current_user.role != "admin" and not submission_service.is_submission_open(db):
        raise HTTPException(status_code=409, detail="Submission window is closed")

    # Re-validate GitHub if it changed
    if payload.github_link:
        github_result = await validate_github_repo(payload.github_link)
        if not github_result["valid"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid GitHub repository: {github_result.get('error')}",
            )

    return submission_service.update_submission(db, s, payload)


# ── Delete submission (admin only) ─────────────────────────────────────────

@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    s = submission_service.get_submission_by_id(db, submission_id)
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    submission_service.delete_submission(db, s)
