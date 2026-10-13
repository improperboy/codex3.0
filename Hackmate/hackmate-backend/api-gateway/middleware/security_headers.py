"""
Security headers middleware.
Adds standard defensive HTTP headers to every response from the gateway.
"""
from fastapi import Request


async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)

    # Prevent MIME-type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Deny framing (clickjacking protection)
    response.headers["X-Frame-Options"] = "DENY"

    # Enforce HTTPS for 1 year, include subdomains
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )

    # Restrict information in Referer header to same origin
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Conservative permissions policy — disable features not used by the API
    response.headers["Permissions-Policy"] = (
        "geolocation=(), microphone=(), camera=(), payment=()"
    )

    # Minimal CSP for a pure JSON API (no HTML/scripts served by the gateway)
    response.headers["Content-Security-Policy"] = "default-src 'none'"

    # Remove the Server header so we don't advertise the stack
    if "server" in response.headers:
        del response.headers["server"]

    return response
