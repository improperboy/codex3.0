from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    redis_url: str = ""
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    class Config:
        env_file = (".env", "../.env")
        extra = "ignore"



settings = Settings()
