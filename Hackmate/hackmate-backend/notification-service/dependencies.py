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
    if not x_user_id or not x_user_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user identity headers",
        )
    return CurrentUser(user_id=int(x_user_id), role=x_user_role, name=x_user_name or "")
