"""Publish notification events to the Redis Stream."""
import json
import logging
import os

logger = logging.getLogger(__name__)
STREAM_NAME = "hackmate:notifications"


async def publish_notification(
    user_id: int,
    title: str,
    message: str,
    notif_type: str,
    url: str = "/",
    metadata: dict | None = None,
) -> bool:
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(redis_url, decode_responses=True)
        fields = {
            "user_id": str(user_id),
            "title": title[:80],
            "message": message[:180],
            "type": notif_type,
            "url": url,
            "_retries": "0",
        }
        if metadata:
            fields["metadata"] = json.dumps(metadata)
        await r.xadd(STREAM_NAME, fields)
        await r.aclose()
        return True
    except Exception as exc:
        logger.warning("Failed to publish notification: %s", exc)
        return False
