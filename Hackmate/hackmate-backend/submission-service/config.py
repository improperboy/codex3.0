from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    github_api_token: str = ""  # optional — increases rate limit from 60 to 5000 req/hr
    redis_url: str = ""
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    class Config:
        env_file = (".env", "../.env")
        extra = "ignore"


settings = Settings()
