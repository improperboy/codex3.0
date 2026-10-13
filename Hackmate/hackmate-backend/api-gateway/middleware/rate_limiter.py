"""
Rate limiter using Upstash Redis (HTTP REST).
Falls back to in-memory if Upstash is not configured.
Uses a sliding window algorithm with Redis sorted sets.
"""
import time
import logging
from collections import defaultdict
from fastapi import Request, status
from fastapi.responses import JSONResponse
from config import settings

logger = logging.getLogger(__name__)

# In-memory fallback store
_request_log: dict = defaultdict(list)

# Upstash HTTP client (lazy init)
_upstash_client = None
_upstash_unavailable = False  # cached failure flag — avoids retrying on every request


def _get_upstash_client():
    global _upstash_client, _upstash_unavailable
    # If we already know Upstash is unreachable, skip immediately
    if _upstash_unavailable:
        return None
    if _upstash_client is None and settings.upstash_redis_rest_url and settings.upstash_redis_rest_token:
        try:
            from upstash_redis import Redis
            client = Redis(
                url=settings.upstash_redis_rest_url,
                token=settings.upstash_redis_rest_token,
            )
            # Probe the connection once so we fail fast at startup, not per-request
            client.ping()
            _upstash_client = client
            logger.info("Upstash Redis rate limiter initialized")
        except ImportError:
            logger.warning("upstash-redis not installed — falling back to in-memory rate limiting")
            _upstash_unavailable = True
        except Exception as exc:
            logger.warning("Upstash Redis unreachable (%s) — using in-memory rate limiting for this session", exc)
            _upstash_unavailable = True
    return _upstash_client


def _in_memory_check(client_ip: str, now: float) -> bool:
    """Returns True if request is allowed."""
    window_start = now - settings.rate_limit_window
    _request_log[client_ip] = [ts for ts in _request_log[client_ip] if ts > window_start]
    if len(_request_log[client_ip]) >= settings.rate_limit_requests:
        return False
    _request_log[client_ip].append(now)
    return True


def _upstash_check(redis, client_ip: str, now: float) -> bool:
    """
    Sliding window rate limit via Redis sorted set.
    Key: ratelimit:{ip}, score = timestamp, member = timestamp (unique via nano suffix).
    Returns True if request is allowed.
    """
    key = f"ratelimit:{client_ip}"
    window_start = now - settings.rate_limit_window
    member = f"{now:.6f}"

    redis.zremrangebyscore(key, "-inf", window_start)
    redis.zadd(key, {member: now})
    count = redis.zcard(key)
    redis.expire(key, settings.rate_limit_window + 1)

    return count <= settings.rate_limit_requests


async def rate_limit_middleware(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)

    # Only trust X-Forwarded-For when the direct peer is a known proxy.
    # This prevents IP spoofing from untrusted clients sending forged headers.
    peer_ip = request.client.host if request.client else "unknown"
    trusted_proxies: set[str] = {
        ip.strip()
        for ip in settings.trusted_proxy_ips.split(",")
        if ip.strip()
    }

    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for and peer_ip in trusted_proxies:
        # Take the leftmost (client) IP from the chain
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = peer_ip

    now = time.time()

    redis = _get_upstash_client()
    try:
        if redis:
            allowed = _upstash_check(redis, client_ip, now)
        else:
            allowed = _in_memory_check(client_ip, now)
    except Exception as exc:
        global _upstash_unavailable
        logger.warning("Rate limiter error (%s) — falling back to in-memory", exc)
        _upstash_unavailable = True  # don't retry Upstash for the rest of this session
        allowed = _in_memory_check(client_ip, now)

    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": f"Rate limit exceeded. Max {settings.rate_limit_requests} requests per {settings.rate_limit_window}s."},
        )

    return await call_next(request)
