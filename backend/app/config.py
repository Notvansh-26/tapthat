from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    database_url: str = "postgresql://tapthat:changeme_local_dev@localhost:5432/tapthat"
    cors_origins: str = "http://localhost:3000"

    class Config:
        env_file = str(ENV_FILE)
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
