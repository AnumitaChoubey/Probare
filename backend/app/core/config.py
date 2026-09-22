from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, computed_field, model_validator
from typing import List, Union

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "QEMS Enterprise Backend"
    API_V1_STR: str = "/api/v1"
    APPLICATION_ENV: str = "development"
    AUTH_PROVIDER: str = "entra"
    
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    DATABASE_URL: str
    REDIS_URL: str
    
    STORAGE_ENDPOINT: str
    STORAGE_ACCESS_KEY: str
    STORAGE_SECRET_KEY: str
    STORAGE_BUCKET: str

    MICROSOFT_CLIENT_ID: str | None = None
    MICROSOFT_TENANT_ID: str | None = None
    MICROSOFT_CLIENT_SECRET: str | None = None
    MICROSOFT_REDIRECT_URI: str | None = None

    CLERK_PUBLISHABLE_KEY: str | None = None
    CLERK_SECRET_KEY: str | None = None
    CLERK_ISSUER_URL: str | None = None

    AI_PROVIDER: str = "gemini"
    AI_API_KEY: str | None = None
    
    MS_GRAPH_PROVIDER: str = "mock"
    MS_GRAPH_WEBHOOK_SECRET: str | None = None
    TEAMS_WEBHOOK_URL: str | None = None
    
    SLA_CHECK_INTERVAL_SECONDS: int = 60

    @computed_field
    @property
    def is_production(self) -> bool:
        return self.APPLICATION_ENV == "production"

    @model_validator(mode='after')
    def validate_production_mock(self):
        if self.APPLICATION_ENV == "production" and self.AI_PROVIDER.lower() == "mock":
            raise ValueError("Mock AI Provider is not allowed in production")
        if self.APPLICATION_ENV == "production" and self.MS_GRAPH_PROVIDER.lower() == "mock":
            raise ValueError("Mock MS Graph Provider is not allowed in production")
        if self.APPLICATION_ENV == "production" and self.AUTH_PROVIDER.lower() not in ["entra", "clerk"]:
            raise ValueError("Production environment requires Entra or Clerk authentication.")
        return self

settings = Settings()
