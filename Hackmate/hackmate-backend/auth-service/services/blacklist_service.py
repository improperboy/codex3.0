"""
Token revocation blacklist backed by Upstash Redis (HTTP REST).
Falls back to an in-process set when Redis is unavailable so that
logout still works; the caveat is that the in-memory set is lost
on restart and doesn't share state across multiple instances.
"""
import logging
from config import settings

logger = logging.getLogger(__name__)

# ── in-memory fallback ────────────────────────────────────────────────────────
_fallback_blacklist: set[str] = set()

# ── Upstash client (lazy init) ────────────────────────────────────────────────
_redis_client = None
_redis_unavailable = False  # cached once to avoid retrying on every request


def _get_redis():
    global _redis_client, _redis_unavailable
    if _redis_unavailable:
        return None
    if _redis_client is None:
        if not settings.upstash_redis_rest_url or not settings.upstash_redis_rest_token:
            _redis_unavailable = True
            return None
        try:
            from upstash_redis import Redis
            client = Redis(
                url=settings.upstash_redis_rest_url,
                token=settings.upstash_redis_rest_token,
            )
            client.ping()
            _redis_client = client
            logger.info("Blacklist: connected to Upstash Redis")
        except ImportError:
            logger.warning("Blacklist: upstash-redis not installed — using in-memory fallback")
            _redis_unavailable = True
        except Exception as exc:
            logger.warning("Blacklist: Upstash unreachable (%s) — using in-memory fallback", exc)
            _redis_unavailable = True
    return _redis_client


# Prefix all keys so they're easy to identify in Redis
_KEY_PREFIX = "blacklist:token:"


def revoke_token(jti: str, ttl_seconds: int) -> None:
    """Add a token's JTI to the blacklist with an expiry matching the token's TTL."""
    redis = _get_redis()
    if redis:
        try:
            redis.set(_KEY_PREFIX + jti, "1", ex=ttl_seconds)
            return
        except Exception as exc:
            logger.warning("Blacklist: Redis SET failed (%s) — falling back to in-memory", exc)
    _fallback_blacklist.add(jti)


def is_revoked(jti: str) -> bool:
    """Return True if the token has been revoked."""
    redis = _get_redis()
    if redis:
        try:
            return bool(redis.get(_KEY_PREFIX + jti))
        except Exception as exc:
            logger.warning("Blacklist: Redis GET failed (%s) — checking in-memory", exc)
    return jti in _fallback_blacklist
