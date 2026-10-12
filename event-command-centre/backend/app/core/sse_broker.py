"""In-process SSE broker.

After any committed write that changes dashboard or risk state, call
`broker.publish(event_id, event_type)`. Subscribed SSE connections
receive the event and trigger a client refetch.

For multiple API instances, replace this with Postgres LISTEN/NOTIFY.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import AsyncGenerator


class SSEBroker:
    def __init__(self) -> None:
        self._queues: dict[str, list[asyncio.Queue]] = defaultdict(list)

    def publish(self, event_id: str, event_type: str) -> None:
        """Notify all subscribers for this event_id."""
        message = f"event: {event_type}\ndata: {event_id}\n\n"
        for queue in self._queues[event_id]:
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                pass  # slow subscriber — skip this message

    async def subscribe(self, event_id: str) -> AsyncGenerator[str, None]:
        """Async generator that yields SSE-formatted strings."""
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=50)
        self._queues[event_id].append(queue)
        try:
            # Send an initial keep-alive comment
            yield ": connected\n\n"
            while True:
                message = await asyncio.wait_for(queue.get(), timeout=30)
                yield message
        except TimeoutError:
            # Send keep-alive ping so the connection stays open
            yield ": ping\n\n"
            # Re-subscribe (the generator will be called again by the SSE endpoint)
        finally:
            self._queues[event_id].remove(queue)


# Module-level singleton used by services and the SSE router
broker = SSEBroker()
