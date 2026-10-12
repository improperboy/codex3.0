"""Application settings loaded from environment variables."""
from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    DATABASE_URL: str
    MIGRATION_DATABASE_URL: str = ""
    DEMO_ENABLED: bool = False
    CORS_ORIGINS: str = "http://localhost:3000"
    LOG_LEVEL: str = "INFO"
    SSE_IDLE_TIMEOUT_SECONDS: int = 300
    APP_VERSION: str = "0.1.0"

    # Risk / recommendation thresholds (can be overridden per environment)
    REGISTRATION_CONVERSION_THRESHOLD: float = 0.09
    REGISTRATION_PACE_WINDOW_DAYS: int = 14
    CONTENT_BEHIND_PLAN_THRESHOLD: int = 2  # posts
    PARTNER_LATE_DAYS_MEDIUM: int = 3
    PARTNER_LATE_DAYS_HIGH: int = 7

    @field_validator("APP_ENV")
    @classmethod
    def validate_env(cls, v: str) -> str:
        if v not in ("development", "staging", "production"):
            raise ValueError("APP_ENV must be development, staging or production")
        return v

    @field_validator("MIGRATION_DATABASE_URL", mode="before")
    @classmethod
    def default_migration_url(cls, v: str, info: object) -> str:
        # Fall back to DATABASE_URL if not explicitly set
        if not v:
            return ""  # resolved lazily after full model init
        return v

    @property
    def migration_url(self) -> str:
        return self.MIGRATION_DATABASE_URL or self.DATABASE_URL

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def check_production_invariants(self) -> None:
        """Called at startup; raises if unsafe config is detected in production."""
        if self.APP_ENV == "production" and self.DEMO_ENABLED:
            raise RuntimeError(
                "DEMO_ENABLED must be false in production. "
                "Set APP_ENV=development for demo use."
            )


settings = Settings()  # type: ignore[call-arg]
