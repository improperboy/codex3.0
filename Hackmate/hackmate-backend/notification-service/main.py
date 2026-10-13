import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.notifications import router as notif_router
from routers.announcements import router as ann_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_consumer_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _consumer_task
    try:
        from services.consumer import run_consumer
        _consumer_task = asyncio.create_task(run_consumer())
        logger.info("Redis consumer task started")
    except Exception as exc:
        logger.warning("Could not start Redis consumer: %s", exc)
    yield
    if _consumer_task and not _consumer_task.done():
        _consumer_task.cancel()
        try:
            await _consumer_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="HackMate Notification Service",
    version="2.0.0",
    swagger_ui_parameters={"persistAuthorization": True},
    lifespan=lifespan,
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

app.include_router(notif_router, prefix="/notifications", tags=["notifications"])
app.include_router(ann_router, prefix="/announcements", tags=["announcements"])


@app.get("/health")
async def health():
    checks = {"service": "notification", "status": "ok"}
    try:
        import redis.asyncio as aioredis
        from config import settings
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {exc}"
        checks["status"] = "degraded"
    try:
        import sqlalchemy
        from db.database import SessionLocal
        db = SessionLocal()
        try:
            db.execute(sqlalchemy.text("SELECT 1"))
        finally:
            db.close()
        checks["db"] = "ok"
    except Exception as exc:
        checks["db"] = f"error: {exc}"
        checks["status"] = "degraded"
    return checks
