from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    jwt_secret: str
    jwt_algorithm: str = "HS256"

    auth_service_url: str
    user_service_url: str
    team_service_url: str
    scoring_service_url: str
    submission_service_url: str
    notification_service_url: Optional[str] = ""
    chatbot_service_url: Optional[str] = ""
    ai_service_url: Optional[str] = ""
    admin_service_url: str

    # Rate limiting
    rate_limit_requests: int = 100   # requests per window
    rate_limit_window: int = 60      # seconds

    # Upstash Redis (HTTP REST — used by rate limiter and token blacklist)
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    # Trusted proxy IPs that are allowed to set X-Forwarded-For.
    # Set to the IP(s) of your load balancer / reverse proxy (e.g. Nginx, Caddy).
    # Accepts a comma-separated list: "1.2.3.4,5.6.7.8"
    # Leave empty to trust only the direct peer IP (safe default).
    trusted_proxy_ips: str = ""

    # Comma-separated list of allowed Host header values.
    # Requests with a Host not in this list are rejected with 400.
    # Example: "hackmateapi.dulify.in,localhost"
    allowed_hosts: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
