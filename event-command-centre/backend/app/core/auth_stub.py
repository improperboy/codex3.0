"""Role stub for the demo.

Reads the X-Role header and returns the caller's role.
This is NOT an access control — it is a demo convenience.
Replace with real OIDC authentication before any hosted use.

All routers that need the role use `RoleDep` as a FastAPI dependency.
"""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException

VALID_ROLES = frozenset(
    {"leadership", "marketing", "partnerships", "operations", "programme"}
)


def get_role(x_role: str | None = Header(default=None)) -> str:
    """Return the caller role from the X-Role header.

    Defaults to 'leadership' if the header is absent (handy for API exploration).
    Returns 400 for explicitly invalid role values.
    """
    if x_role is None:
        return "leadership"
    role = x_role.lower().strip()
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "invalid_role",
                    "message": f"X-Role must be one of: {', '.join(sorted(VALID_ROLES))}",
                }
            },
        )
    return role


RoleDep = Depends(get_role)
