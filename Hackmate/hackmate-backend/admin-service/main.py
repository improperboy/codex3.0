from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.announcements import router as announcements_router
from routers.analytics import router as analytics_router
from routers.settings import router as settings_router
from routers.venue import router as venue_router
from routers.export import router as export_router
from routers.support import router as support_router
from routers.recommendations import router as rec_router
from routers.activity_logs import router as activity_router
from routers.themes import router as themes_router

app = FastAPI(
    title="HackMate Admin Service",
    version="1.0.0",
    swagger_ui_parameters={"persistAuthorization": True},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hackmate-frontend-ten.vercel.app",
        "https://hackmate.dulify.in",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(announcements_router, prefix="/announcements", tags=["announcements"])
app.include_router(analytics_router, prefix="/admin/analytics", tags=["analytics"])
app.include_router(settings_router, prefix="/admin/settings", tags=["settings"])
app.include_router(venue_router, prefix="/admin/venue", tags=["venue"])
app.include_router(export_router, prefix="/admin/export", tags=["export"])
app.include_router(support_router, prefix="/support", tags=["support"])
app.include_router(rec_router, prefix="/admin/recommendations", tags=["recommendations"])
app.include_router(activity_router, prefix="/admin/activity-logs", tags=["activity-logs"])
app.include_router(themes_router, prefix="/admin/themes", tags=["themes"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "admin"}
