from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./bursary.db"  # swap to Postgres in prod
    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    STORAGE_DIR: str = "storage"
    MAX_UPLOAD_MB: int = 10
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174"
    APPLICATION_PREFIX: str = "TSB"

    class Config:
        env_file = ".env"

settings = Settings()