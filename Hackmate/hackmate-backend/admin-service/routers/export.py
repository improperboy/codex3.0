from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.database import get_db
from dependencies import get_current_user, require_admin, CurrentUser
from services import export_service
from routers.activity_logs import log_activity
import io

router = APIRouter()


def csv_response(content: str, filename: str) -> StreamingResponse:
    return StreamingResponse(
        io.StringIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def pdf_response(content: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/users")
def export_users(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    log_activity(db, current_user.id, "export_users", "export", None, "Exported users CSV")
    return csv_response(export_service.export_users_csv(db), "users.csv")


@router.get("/teams")
def export_teams(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    log_activity(db, current_user.id, "export_teams", "export", None, "Exported teams CSV")
    return csv_response(export_service.export_teams_csv(db), "teams.csv")


@router.get("/scores")
def export_scores(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    log_activity(db, current_user.id, "export_scores", "export", None, "Exported scores CSV")
    return csv_response(export_service.export_scores_csv(db), "scores.csv")


@router.get("/submissions")
def export_submissions(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    log_activity(db, current_user.id, "export_submissions", "export", None, "Exported submissions CSV")
    return csv_response(export_service.export_submissions_csv(db), "submissions.csv")


@router.get("/teams/{team_id}/pdf")
def export_team_pdf(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    row = db.execute(text("""
        SELECT t.name, t.idea, t.problem_statement, t.tech_skills, t.status,
               u.name as leader_name, u.email as leader_email,
               th.name as theme_name, f.floor_number, r.room_number
        FROM teams t
        LEFT JOIN users u ON t.leader_id = u.id
        LEFT JOIN themes th ON t.theme_id = th.id
        LEFT JOIN floors f ON t.floor_id = f.id
        LEFT JOIN rooms r ON t.room_id = r.id
        WHERE t.id = :tid
    """), {"tid": team_id}).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Team not found")

    members = db.execute(text("""
        SELECT u.name, u.email, u.tech_stack
        FROM team_members tm JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = :tid AND tm.status = 'approved'
    """), {"tid": team_id}).fetchall()

    submission = db.execute(text(
        "SELECT github_link, live_link, tech_stack, ppt_link, demo_video FROM submissions WHERE team_id = :tid"
    ), {"tid": team_id}).fetchone()

    scores = db.execute(text("""
        SELECT mr.round_name, AVG(s.score) as avg_score
        FROM scores s JOIN mentoring_rounds mr ON s.round_id = mr.id
        WHERE s.team_id = :tid GROUP BY s.round_id, mr.round_name
    """), {"tid": team_id}).fetchall()

    pdf_bytes = export_service.generate_team_pdf(row, members, submission, scores)
    return pdf_response(pdf_bytes, f"team_{team_id}_report.pdf")
