"""
Redis Streams consumer worker.
Reads from hackmate:notifications, checks preferences, saves to DB, sends pushes.
Implements retry logic with exponential backoff and dead letter stream.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone

import redis.asyncio as aioredis
from sqlalchemy.orm import Session

from config import settings
from db.database import SessionLocal
from services.push_service import (
    is_opted_in, save_notification, get_user_subscriptions, send_web_push
)

logger = logging.getLogger(__name__)

# Retry delays in seconds: attempt 2→5s, 3→15s, 4→45s
RETRY_DELAYS = [0, 5, 15, 45]
MAX_RETRIES = 3


async def _ensure_consumer_group(r: aioredis.Redis) -> None:
    """Create stream + consumer group if they don't exist yet."""
    try:
        await r.xgroup_create(settings.stream_name, settings.consumer_group, id="0", mkstream=True)
        logger.info("Consumer group '%s' created on stream '%s'", settings.consumer_group, settings.stream_name)
    except Exception as exc:
        if "BUSYGROUP" in str(exc):
            pass  # already exists
        else:
            raise


async def _move_to_dead_letter(r: aioredis.Redis, msg_id: str, fields: dict, reason: str) -> None:
    await r.xadd(settings.dead_letter_stream, {
        **fields,
        "_original_id": msg_id,
        "_failure_reason": reason,
        "_failed_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.error("Moved msg %s to dead letter stream. Reason: %s", msg_id, reason)


async def _process_message(r: aioredis.Redis, msg_id: str, fields: dict) -> None:
    """Process one stream message end-to-end."""
    db: Session = SessionLocal()
    try:
        user_id = int(fields.get("user_id", 0))
        title = fields.get("title", "")
        message = fields.get("message", "")
        notif_type = fields.get("type", "")
        url = fields.get("url", "/")
        metadata_raw = fields.get("metadata")
        retries = int(fields.get("_retries", 0))

        metadata = None
        if metadata_raw:
            try:
                metadata = json.loads(metadata_raw)
            except Exception:
                metadata = {"raw": metadata_raw}

        saved_flag = fields.get("_saved") == "1"
        failed_subs_str = fields.get("_failed_subs")
        failed_subs_list = failed_subs_str.split(",") if failed_subs_str else None

        # Step 1: Check preferences — skip if opted out
        if not saved_flag and not is_opted_in(db, user_id, notif_type):
            logger.debug("User %s opted out of %s — skipping", user_id, notif_type)
            await r.xack(settings.stream_name, settings.consumer_group, msg_id)
            return

        # Step 2: Save to notifications table (only on first attempt)
        if not saved_flag:
            save_notification(db, user_id, title, message, notif_type, url, metadata)

        # Step 3: Fetch all push subscriptions for this user
        subscriptions = get_user_subscriptions(db, user_id)

        # Step 4: Send push to each subscription (skipping those that already succeeded)
        push_failed = False
        new_failed_subs = []
        for sub in subscriptions:
            if failed_subs_list is not None and str(sub.id) not in failed_subs_list:
                continue  # Succeeded in a previous retry
            
            try:
                await send_web_push(db, sub, title, message, url, notif_type)
            except Exception as exc:
                push_failed = True
                new_failed_subs.append(str(sub.id))
                logger.warning("Push failed for user=%s sub=%s: %s", user_id, sub.id, exc)

        if not push_failed:
            await r.xack(settings.stream_name, settings.consumer_group, msg_id)
            return

        # Step 5: Retry logic
        if retries >= MAX_RETRIES:
            await _move_to_dead_letter(r, msg_id, fields, "Max retries exceeded")
            await r.xack(settings.stream_name, settings.consumer_group, msg_id)
            return

        # Re-queue with incremented retry count after delay
        delay = RETRY_DELAYS[min(retries + 1, len(RETRY_DELAYS) - 1)]
        await asyncio.sleep(delay)
        
        # Carry over idempotency flags
        requeue_fields = {
            **fields, 
            "_retries": str(retries + 1),
            "_saved": "1",
            "_failed_subs": ",".join(new_failed_subs)
        }
        await r.xadd(settings.stream_name, requeue_fields)
        await r.xack(settings.stream_name, settings.consumer_group, msg_id)
        logger.info("Re-queued msg %s for retry %d (delay was %ds)", msg_id, retries + 1, delay)

    except Exception as exc:
        logger.exception("Unhandled error processing msg %s: %s", msg_id, exc)
        # Don't ack — leave in PEL for reclaim
    finally:
        db.close()


async def run_consumer() -> None:
    """Main consumer loop — runs forever as a background task."""
    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    await _ensure_consumer_group(r)
    logger.info("Consumer started, reading from '%s'", settings.stream_name)

    while True:
        try:
            results = await r.xreadgroup(
                groupname=settings.consumer_group,
                consumername=settings.consumer_name,
                streams={settings.stream_name: ">"},
                count=10,
                block=5000,  # 5 second blocking timeout
            )
            if not results:
                continue

            for _stream, messages in results:
                for msg_id, fields in messages:
                    await _process_message(r, msg_id, fields)

        except asyncio.CancelledError:
            logger.info("Consumer cancelled — shutting down")
            break
        except Exception as exc:
            logger.exception("Consumer loop error: %s", exc)
            await asyncio.sleep(2)

    await r.aclose()
