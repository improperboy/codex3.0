from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from dependencies import get_current_user, require_admin, CurrentUser
from schemas.admin import AnalyticsResponse, DashboardStats, DailyActivity
from services import analytics_service

router = APIRouter()


@router.get("/", response_model=AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    require_admin(current_user)
    stats = analytics_service.get_dashboard_stats(db)
    daily = analytics_service.get_daily_activity(db)
    roles = analytics_service.get_role_distribution(db)
    team_status = analytics_service.get_team_status_distribution(db)
    avg_scores = analytics_service.get_avg_scores_per_round(db)
    top_stacks = analytics_service.get_top_tech_stacks(db)
    locations = analytics_service.get_teams_per_location(db)

    return AnalyticsResponse(
        stats=DashboardStats(**stats),
        daily_activity=[DailyActivity(**d) for d in daily],
        role_distribution=roles,
        team_status_distribution=team_status,
        avg_scores_per_round=avg_scores,
        top_tech_stacks=top_stacks,
        teams_per_location=locations,
    )
