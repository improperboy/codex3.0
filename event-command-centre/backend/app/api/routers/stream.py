"""SSE stream router."""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.sse_broker import broker

router = APIRouter(tags=["stream"])


@router.get("/events/{event_id}/stream")
async def event_stream(event_id: str):
    """Server-Sent Events stream for dashboard and risk updates."""
    async def _generate():
        async for message in broker.subscribe(event_id):
            yield message

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable Nginx buffering
        },
    )
