from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    max_team_size: int = 4
    redis_url: str = ""
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
