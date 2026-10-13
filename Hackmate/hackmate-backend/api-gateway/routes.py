import os
import httpx
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse, Response
from config import settings

router = APIRouter()

SERVICE_MAP = {
    "/auth":          settings.auth_service_url,
    "/users":         settings.user_service_url,
    "/teams":         settings.team_service_url,
    "/rounds":        settings.scoring_service_url,
    "/scores":        settings.scoring_service_url,
    "/rankings":      settings.scoring_service_url,
    "/submissions":   settings.submission_service_url,
    "/notifications": settings.notification_service_url,
    "/announcements": settings.admin_service_url,
    "/chatbot":       settings.chatbot_service_url,
    "/ai":            settings.ai_service_url,
    "/admin":         settings.admin_service_url,
    "/support":       settings.admin_service_url,
    "/recommendations": settings.admin_service_url,
    "/activity-logs": settings.admin_service_url,
}


def resolve_service(path: str) -> str | None:
    for prefix, url in SERVICE_MAP.items():
        if path.startswith(prefix):
            return url if url else None
    return None


@router.get("/health", include_in_schema=True)
async def health():
    return {"status": "ok", "service": "api-gateway"}
#

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False)
async def proxy(path: str, request: Request):
    full_path = f"/{path}"
    base_url = resolve_service(full_path)

    if not base_url:
        raise HTTPException(status_code=404, detail=f"No service found for path: {full_path}")

    url = f"{base_url}{full_path}"
    body = await request.body()

    # Forward original headers, drop hop-by-hop headers and internal auth headers
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in (
            "host", "content-length", "transfer-encoding",
            "x-user-id", "x-user-role", "x-user-name"
        )
    }

    # Inject validated user context so downstream services don't need to re-verify JWT
    if hasattr(request.state, "user_id") and request.state.user_id:
        headers["X-User-Id"]   = str(request.state.user_id)
        headers["X-User-Role"] = str(request.state.user_role)
        headers["X-User-Name"] = str(request.state.user_name)

    if request.url.query:
        url = f"{url}?{request.url.query}"

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
            )

            # Pass through content-type aware responses
            content_type = resp.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    return JSONResponse(
                        status_code=resp.status_code,
                        content=resp.json(),
                    )
                except Exception:
                    pass

            # Fallback: return raw response (e.g. PDF, CSV downloads)
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                media_type=content_type,
            )

        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail=f"Service unavailable: {base_url}",
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail=f"Service timed out: {base_url}",
            )
