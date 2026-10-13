from fastapi import Header, HTTPException, status
from typing import Optional


class CurrentUser:
    def __init__(self, user_id: int, role: str, name: str):
        self.user_id = user_id
        self.role = role
        self.name = name


def get_current_user(
    x_user_id: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
) -> CurrentUser:
    """
    Reads user identity injected by the API Gateway.
    No JWT verification needed here — gateway already validated it.
    """
    if not x_user_id or not x_user_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user identity headers",
        )
    return CurrentUser(
        user_id=int(x_user_id),
        role=x_user_role,
        name=x_user_name or "",
    )


def require_admin(current_user: CurrentUser = None) -> CurrentUser:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
