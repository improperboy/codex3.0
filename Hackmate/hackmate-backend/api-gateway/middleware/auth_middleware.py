from fastapi import Request, status
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from config import settings
import logging

logger = logging.getLogger(__name__)

# Routes that do NOT require a JWT token
PUBLIC_ROUTES = {
    ("POST", "/auth/login"),
    ("POST", "/auth/register"),
    ("POST", "/auth/refresh"),
    ("GET",  "/health"),
    ("GET",  "/docs"),
    ("GET",  "/openapi.json"),
    ("GET",  "/redoc"),
}

# Routes restricted to specific roles only
# Format: (method, path_prefix) -> set of allowed roles
ROLE_RESTRICTED = {
    ("GET",    "/admin"):  {"admin"},
    ("POST",   "/admin"):  {"admin"},
    ("PUT",    "/admin"):  {"admin"},
    ("DELETE", "/admin"):  {"admin"},
    ("POST",   "/rounds"): {"admin"},
    ("PUT",    "/rounds"): {"admin"},
    ("DELETE", "/rounds"): {"admin"},
    ("POST",   "/scores"): {"mentor", "admin"},
    ("PUT",    "/scores"): {"mentor", "admin"},
    ("POST",   "/users"):  {"admin"},
    ("DELETE", "/users"):  {"admin"},
}

# GET /users routes accessible to non-admins
USER_GET_PUBLIC_PREFIXES = (
    "/users/me",
    "/users/search",
    "/users/skills/all",
)

# Admin sub-paths accessible to all authenticated users
ADMIN_PUBLIC_PREFIXES = (
    "/admin/settings/public",
    "/admin/settings/team-management",
    "/admin/venue/volunteer-assignments/mine",
)

# ── Token blacklist check (via Upstash Redis) ─────────────────────────────────
_blacklist_redis = None
_blacklist_unavailable = False


def _get_blacklist_redis():
    global _blacklist_redis, _blacklist_unavailable
    if _blacklist_unavailable:
        return None
    if _blacklist_redis is None:
        if not settings.upstash_redis_rest_url or not settings.upstash_redis_rest_token:
            _blacklist_unavailable = True
            return None
        try:
            from upstash_redis import Redis
            client = Redis(
                url=settings.upstash_redis_rest_url,
                token=settings.upstash_redis_rest_token,
            )
            client.ping()
            _blacklist_redis = client
            logger.info("Gateway blacklist: connected to Upstash Redis")
        except Exception as exc:
            logger.warning("Gateway blacklist: Upstash unavailable (%s) — skipping revocation checks", exc)
            _blacklist_unavailable = True
    return _blacklist_redis


def _is_token_revoked(jti: str) -> bool:
    """Return True if the token's JTI is in the Redis revocation blacklist."""
    if not jti:
        return False
    redis = _get_blacklist_redis()
    if redis is None:
        return False  # fail open — don't block traffic when Redis is down
    try:
        return bool(redis.get(f"blacklist:token:{jti}"))
    except Exception as exc:
        logger.warning("Gateway blacklist: Redis GET error (%s) — failing open", exc)
        return False


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def is_public(method: str, path: str) -> bool:
    if method == "OPTIONS":
        return True
    # Allow GET requests to team-management settings endpoint (public)
    if method == "GET" and path == "/admin/settings/team-management":
        return True
    return (method, path) in PUBLIC_ROUTES or path.startswith("/auth/")


def check_role(method: str, path: str, role: str) -> bool:
    # Allow any authenticated user to access specific GET /users/* routes
    if method == "GET" and path.startswith(USER_GET_PUBLIC_PREFIXES):
        return True
    # Allow any authenticated user to access public admin sub-paths
    if method == "GET" and path.startswith(ADMIN_PUBLIC_PREFIXES):
        return True
    # Admin-only: GET /users/ (list all users) and GET /users/{id} (view any user)
    if method == "GET" and path.startswith("/users") and not path.startswith(USER_GET_PUBLIC_PREFIXES):
        return role == "admin"
    for (m, prefix), allowed_roles in ROLE_RESTRICTED.items():
        if method == m and path.startswith(prefix):
            return role in allowed_roles
    return True  # no restriction defined — allow any authenticated user


async def auth_middleware(request: Request, call_next):
    method = request.method
    path = request.url.path

    # Always allow public routes through
    if is_public(method, path):
        return await call_next(request)

    # Extract Bearer token
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Missing or invalid Authorization header"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)

    if not payload:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Invalid or expired token"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check token revocation blacklist (logout invalidation)
    if _is_token_revoked(payload.get("jti")):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Token has been revoked. Please log in again."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    role = payload.get("role", "")

    # Role-based access check
    if not check_role(method, path, role):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": f"Access denied for role '{role}'"},
        )

    # Inject user info as headers so downstream services can trust them
    request.state.user_id = payload.get("sub")
    request.state.user_role = role
    request.state.user_name = payload.get("name", "")

    return await call_next(request)
