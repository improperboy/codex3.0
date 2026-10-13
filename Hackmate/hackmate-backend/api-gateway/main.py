from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from middleware.auth_middleware import auth_middleware
from middleware.rate_limiter import rate_limit_middleware
from middleware.maintenance import maintenance_middleware
from middleware.security_headers import security_headers_middleware
from routes import router
from config import settings

app = FastAPI(
    title="HackMate API Gateway",
    version="1.0.0",
    swagger_ui_parameters={"persistAuthorization": True},
)

# ── Trusted Host enforcement (outermost — reject spoofed Host headers early) ──
# Only active when ALLOWED_HOSTS is set in .env.
_allowed_hosts = [h.strip() for h in settings.allowed_hosts.split(",") if h.strip()]
if _allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)

# ── Security headers — added to every response ────────────────────────────────
app.add_middleware(BaseHTTPMiddleware, dispatch=security_headers_middleware)

# ── JWT auth + role enforcement ───────────────────────────────────────────────
app.add_middleware(BaseHTTPMiddleware, dispatch=auth_middleware)

# ── Maintenance mode check ────────────────────────────────────────────────────
app.add_middleware(BaseHTTPMiddleware, dispatch=maintenance_middleware)

# ── Rate limiter — runs before auth ──────────────────────────────────────────
app.add_middleware(BaseHTTPMiddleware, dispatch=rate_limit_middleware)

# ── CORS — outermost application layer ───────────────────────────────────────
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

app.include_router(router)
