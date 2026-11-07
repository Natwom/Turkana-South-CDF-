import secrets
from typing import List, Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_KEYS = {"", "dev-secret-change-me", "changeme", "secret", "change-me"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # "development" or "production". Production turns on strict checks.
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "sqlite:///./bursary.db"
    # REQUIRED in production: at least 32 random characters.
    #   python -c "import secrets; print(secrets.token_urlsafe(48))"
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    STORAGE_DIR: str = "storage"
    MAX_UPLOAD_MB: int = 10
    MAX_DOCS_PER_APPLICATION: int = 30

    # Exact origins only (no wildcards). Comma separated.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174"
    # Host headers the API will answer to. Comma separated.
    ALLOWED_HOSTS: str = "localhost,127.0.0.1"

    APPLICATION_PREFIX: str = "TSB"

    # Admin session cookie
    COOKIE_NAME: str = "tsb_admin"
    COOKIE_DOMAIN: Optional[str] = None

    # Use e.g. redis://localhost:6379/0 when running more than one worker
    RATE_LIMIT_STORAGE_URI: str = "memory://"

    # First-run super admin (only used if no SUPER_ADMIN exists yet)
    INITIAL_ADMIN_USERNAME: str = "superadmin"
    INITIAL_ADMIN_EMAIL: str = "admin@turkanasouth.go.ke"
    INITIAL_ADMIN_PASSWORD: Optional[str] = None

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cookie_secure(self) -> bool:
        return self.is_production

    @property
    def cors_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def host_list(self) -> List[str]:
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]

    @model_validator(mode="after")
    def _validate(self):
        if self.is_production:
            if self.SECRET_KEY in _INSECURE_KEYS or len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be a random string of at least 32 characters in production.")
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError("Use PostgreSQL in production (DATABASE_URL is SQLite).")
            if "*" in self.cors_list or any(o.startswith("http://") for o in self.cors_list):
                raise ValueError("CORS_ORIGINS must be exact https:// origins in production.")
        elif self.SECRET_KEY in _INSECURE_KEYS:
            # Dev convenience: random per-process key (sessions reset on restart).
            self.SECRET_KEY = secrets.token_urlsafe(48)
        return self


settings = Settings()