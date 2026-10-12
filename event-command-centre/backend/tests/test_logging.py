"""Tests for structured logging and request ID tracking."""
import logging
import pytest
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import (
    RequestIdFilter,
    RequestIdFormatter,
    RequestIdMiddleware,
    configure_logging,
    get_request_id,
    request_id_ctx,
)


def test_logging_default_request_id():
    """Verify that logging outside a request context does not fail and uses default '-'."""
    configure_logging("INFO")
    logger = logging.getLogger("test_logger")

    # Record factory ensures record has request_id
    record = logger.makeRecord("test_logger", logging.INFO, "fn", 1, "test message", (), None)
    assert hasattr(record, "request_id")
    assert record.request_id == "-"

    formatter = RequestIdFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s"
    )
    formatted = formatter.format(record)
    assert "request_id=-" in formatted
    assert "test message" in formatted


def test_logging_with_active_request_id():
    """Verify that setting request_id_ctx propagates to LogRecords and formatted output."""
    configure_logging("INFO")
    logger = logging.getLogger("test_logger")

    token = request_id_ctx.set("req-test-999")
    try:
        assert get_request_id() == "req-test-999"
        record = logger.makeRecord("test_logger", logging.INFO, "fn", 1, "test active", (), None)
        assert record.request_id == "req-test-999"

        formatter = RequestIdFormatter(
            fmt="%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s"
        )
        formatted = formatter.format(record)
        assert "request_id=req-test-999" in formatted
    finally:
        request_id_ctx.reset(token)

    assert get_request_id() == "-"


@pytest.mark.asyncio
async def test_request_id_middleware():
    """Verify that RequestIdMiddleware sets header, state, and contextvar."""
    middleware = RequestIdMiddleware(app=None)

    captured_ctx_id = None
    captured_state_id = None

    async def call_next(request: Request) -> Response:
        nonlocal captured_ctx_id, captured_state_id
        captured_ctx_id = get_request_id()
        captured_state_id = getattr(request.state, "request_id", None)
        return Response("ok", status_code=200)

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/health",
        "headers": [(b"x-request-id", b"custom-client-id")],
    }
    request = Request(scope)
    response = await middleware.dispatch(request, call_next)

    assert response.headers["x-request-id"] == "custom-client-id"
    assert captured_ctx_id == "custom-client-id"
    assert captured_state_id == "custom-client-id"
    # Ensure context was reset after dispatch
    assert get_request_id() == "-"
