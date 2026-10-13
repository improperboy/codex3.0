import httpx
from fastapi import Request
from fastapi.responses import JSONResponse
from config import settings

_maintenance_cache: dict = {"enabled": False, "checked_at": 0}
CACHE_TTL = 30  # seconds


async def maintenance_middleware(request: Request, call_next):
    import time

    # Admins always bypass; health check always passes
    if request.url.path in ("/health",):
        return await call_next(request)

    now = time.time()
    # Refresh cache every 30s to avoid hammering admin-service
    if now - _maintenance_cache["checked_at"] > CACHE_TTL:
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                resp = await client.get(
                    f"{settings.admin_service_url}/admin/settings/maintenance_mode",
                    headers={"X-User-Id": "0", "X-User-Role": "admin", "X-User-Name": "gateway"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    _maintenance_cache["enabled"] = data.get("setting_value") in ("1", "true", True)
        except Exception:
            pass  # if admin-service is down, don't block requests
        _maintenance_cache["checked_at"] = now

    if _maintenance_cache["enabled"]:
        # Check if the request is from an admin (has valid token with admin role)
        from middleware.auth_middleware import decode_token
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            payload = decode_token(auth_header.split(" ", 1)[1])
            if payload and payload.get("role") == "admin":
                return await call_next(request)

        return JSONResponse(
            status_code=503,
            content={
                "detail": "System is under maintenance. Please try again later.",
                "maintenance": True,
            },
        )

    return await call_next(request)
