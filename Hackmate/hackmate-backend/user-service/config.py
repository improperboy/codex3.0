from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    redis_url: str = ""
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
