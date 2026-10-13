from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    groq_api_key: str
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    service_name: str = "ai-service"

    class Config:
        env_file = ".env"


settings = Settings()
