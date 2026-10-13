"""
Resilient Cache Service for admin-service.
Supports both self-hosted Docker Redis (REDIS_URL) and Upstash Redis REST (UPSTASH_REDIS_REST_URL).
Fails open on errors without interrupting database transactions or user requests.
Provides stampede locks (acquire_lock / release_lock) and metrics tracking.
"""
import json
import logging
import uuid
from typing import Any, Optional
from config import settings

logger = logging.getLogger(__name__)
SERVICE_NAME = "admin-service"


class CacheService:
    def __init__(self):
        self._sync_redis = None
        self._upstash_redis = None
        self._client_type = None  # "standard" | "upstash" | None
        self._metrics = {
            "hits": 0,
            "misses": 0,
            "errors": 0,
            "sets": 0,
            "invalidations": 0,
            "lock_contentions": 0,
        }
        self._init_client()

    def _init_client(self):
        # 1. Prefer self-hosted standard Redis if REDIS_URL is configured
        redis_url = getattr(settings, "redis_url", "")
        if redis_url:
            try:
                import importlib
                redis_mod = importlib.import_module("redis")
                client = redis_mod.from_url(redis_url, decode_responses=True, socket_timeout=2.0)
                client.ping()
                self._sync_redis = client
                self._client_type = "standard"
                logger.info("[%s] Cache connected to standard/docker Redis", SERVICE_NAME)
                return
            except (ImportError, ModuleNotFoundError):
                logger.warning("[%s] 'redis' package not installed — falling back", SERVICE_NAME)
            except Exception as exc:
                logger.warning("[%s] Standard Redis unreachable (%s), trying Upstash...", SERVICE_NAME, exc)

        # 2. Try Upstash Redis REST if configured
        rest_url = getattr(settings, "upstash_redis_rest_url", "")
        rest_token = getattr(settings, "upstash_redis_rest_token", "")
        if rest_url and rest_token:
            try:
                import importlib
                upstash_mod = importlib.import_module("upstash_redis")
                client = upstash_mod.Redis(url=rest_url, token=rest_token)
                client.ping()
                self._upstash_redis = client
                self._client_type = "upstash"
                logger.info("[%s] Cache connected to Upstash Redis REST", SERVICE_NAME)
                return
            except (ImportError, ModuleNotFoundError):
                logger.warning("[%s] 'upstash-redis' package not installed — falling back", SERVICE_NAME)
            except Exception as exc:
                logger.warning("[%s] Upstash Redis unreachable (%s)", SERVICE_NAME, exc)


        self._client_type = None
        logger.info("[%s] No Redis backend available — cache running in fail-open passthrough mode", SERVICE_NAME)

    def _get_client(self):
        if self._client_type == "standard" and self._sync_redis:
            return self._sync_redis
        if self._client_type == "upstash" and self._upstash_redis:
            return self._upstash_redis
        return None

    def get_json(self, key: str) -> Optional[Any]:
        client = self._get_client()
        if not client:
            self._metrics["misses"] += 1
            return None
        try:
            val = client.get(key)
            if val is None:
                self._metrics["misses"] += 1
                return None
            self._metrics["hits"] += 1
            if isinstance(val, (dict, list)):
                return val
            return json.loads(val)
        except Exception as exc:
            self._metrics["errors"] += 1
            logger.warning("CACHE_ERROR service=%s op=get key=%s err=%s", SERVICE_NAME, key, exc)
            return None

    def set_json(self, key: str, data: Any, ttl_seconds: int) -> bool:
        client = self._get_client()
        if not client:
            return False
        try:
            serialized = json.dumps(data)
            client.set(key, serialized, ex=ttl_seconds)
            self._metrics["sets"] += 1
            return True
        except Exception as exc:
            self._metrics["errors"] += 1
            logger.warning("CACHE_ERROR service=%s op=set key=%s err=%s", SERVICE_NAME, key, exc)
            return False

    def delete(self, key: str) -> bool:
        client = self._get_client()
        if not client:
            return False
        try:
            client.delete(key)
            self._metrics["invalidations"] += 1
            return True
        except Exception as exc:
            self._metrics["errors"] += 1
            logger.warning("CACHE_ERROR service=%s op=delete key=%s err=%s", SERVICE_NAME, key, exc)
            return False

    def delete_keys(self, *keys: str) -> int:
        count = 0
        for k in keys:
            if self.delete(k):
                count += 1
        return count

    def acquire_lock(self, lock_key: str, ttl_seconds: int = 5) -> Optional[str]:
        client = self._get_client()
        if not client:
            return "bypass-token"
        try:
            token = str(uuid.uuid4())
            acquired = client.set(lock_key, token, ex=ttl_seconds, nx=True)
            if acquired:
                return token
            self._metrics["lock_contentions"] += 1
            return None
        except Exception as exc:
            self._metrics["errors"] += 1
            logger.warning("CACHE_ERROR service=%s op=acquire_lock key=%s err=%s", SERVICE_NAME, lock_key, exc)
            return "bypass-token"

    def release_lock(self, lock_key: str, lock_token: str) -> bool:
        if lock_token == "bypass-token":
            return True
        client = self._get_client()
        if not client:
            return False
        try:
            curr = client.get(lock_key)
            if curr == lock_token:
                client.delete(lock_key)
                return True
            return False
        except Exception as exc:
            self._metrics["errors"] += 1
            logger.warning("CACHE_ERROR service=%s op=release_lock key=%s err=%s", SERVICE_NAME, lock_key, exc)
            return False

    def get_metrics(self) -> dict:
        total = self._metrics["hits"] + self._metrics["misses"]
        hit_rate = (self._metrics["hits"] / total) if total > 0 else 0.0
        return {
            **self._metrics,
            "hit_rate": round(hit_rate, 4),
            "client_type": self._client_type,
        }


cache_service = CacheService()
