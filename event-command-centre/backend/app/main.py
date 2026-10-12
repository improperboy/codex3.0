"""FastAPI application factory."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import RequestIdMiddleware, configure_logging

configure_logging(settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings.check_production_invariants()

    app = FastAPI(
        title="Event Command Centre API",
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    )

    # Middleware
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Security headers middleware
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):  # type: ignore[no-untyped-def]
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if settings.APP_ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # Routers
    from app.api.routers.health import router as health_router
    from app.api.routers.events import router as events_router
    from app.api.routers.plans import router as plans_router
    from app.api.routers.risks import router as risks_router
    from app.api.routers.recommendations import router as recommendations_router
    from app.api.routers.tasks import router as tasks_router
    from app.api.routers.workstreams import router as workstreams_router
    from app.api.routers.stream import router as stream_router
    from app.api.routers.demo import router as demo_router

    app.include_router(health_router, prefix="/api")
    app.include_router(events_router, prefix="/api")
    app.include_router(plans_router, prefix="/api")
    app.include_router(risks_router, prefix="/api")
    app.include_router(recommendations_router, prefix="/api")
    app.include_router(tasks_router, prefix="/api")
    app.include_router(workstreams_router, prefix="/api")
    app.include_router(stream_router, prefix="/api")
    app.include_router(demo_router, prefix="/api")

    # Global error handler — generic shape in production
    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s", request.url)
        detail = str(exc) if settings.APP_ENV == "development" else "Internal server error"
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "internal_error", "message": detail}},
        )

    logger.info("Event Command Centre API starting (env=%s)", settings.APP_ENV)
    return app


app = create_app()
