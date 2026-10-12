"""Injectable clock dependency.

Engines and services must never call datetime.now() directly.
Instead they receive `now: datetime` from this dependency so tests
can pass a fixed clock without monkey-patching.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable

from fastapi import Depends


def utc_now() -> datetime:
    """Return the current UTC time. Overrideable in tests."""
    return datetime.now(tz=timezone.utc)


# FastAPI dependency — inject into route handlers or services
def get_clock() -> Callable[[], datetime]:
    return utc_now


ClockDep = Depends(get_clock)
