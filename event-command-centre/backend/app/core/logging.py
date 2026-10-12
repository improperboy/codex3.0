"""Structured logging configuration."""
from __future__ import annotations

import contextvars
import logging
import uuid
from typing import Any

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


def get_request_id() -> str:
    """Return the active request ID in current context, or '-' if none."""
    return request_id_ctx.get()


class RequestIdFilter(logging.Filter):
    """Ensure every LogRecord has a request_id attribute populated from context."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = request_id_ctx.get()
        return True


class RequestIdFormatter(logging.Formatter):
    """Formatter that falls back to context request_id if missing from record."""

    def format(self, record: logging.LogRecord) -> str:
        if not hasattr(record, "request_id"):
            record.request_id = request_id_ctx.get()
        return super().format(record)


def configure_logging(level: str = "INFO") -> None:
    """Configure root logger with structured formatting and request_id injection."""
    old_factory = logging.getLogRecordFactory()

    def record_factory(*args: Any, **kwargs: Any) -> logging.LogRecord:
        record = old_factory(*args, **kwargs)
        if not hasattr(record, "request_id"):
            record.request_id = request_id_ctx.get()
        return record

    if getattr(old_factory, "__name__", "") != "record_factory":
        logging.setLogRecordFactory(record_factory)

    formatter = RequestIdFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s"
    )
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    handler.addFilter(RequestIdFilter())

    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        handlers=[handler],
        force=True,
    )


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a unique request_id to every request and response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        # Store on request state so route handlers can access it
        request.state.request_id = request_id
        token = request_id_ctx.set(request_id)
        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
        response.headers["X-Request-Id"] = request_id
        return response

