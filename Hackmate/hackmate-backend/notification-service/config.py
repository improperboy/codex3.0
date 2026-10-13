from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_claims_email: str = "admin@hackmate.com"
    redis_url: str

    stream_name: str = "hackmate:notifications"
    dead_letter_stream: str = "hackmate:notifications:dead"
    consumer_group: str = "notification-service"
    consumer_name: str = "worker-1"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
