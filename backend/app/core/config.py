from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Postgres — all values must come from environment / .env file
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "change_me_in_production"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5433"
    POSTGRES_DB: str = "qems_dev"
    
    # Optional single connection string (overrides individual parts)
    DATABASE_URL: str | None = None
    
    # Auth — RS256 Keypair
    # Central API needs JWT_PRIVATE_KEY to sign tokens. Local desktop apps only need JWT_PUBLIC_KEY to verify.
    JWT_PRIVATE_KEY: str = ""
    JWT_PUBLIC_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Internal Services
    ERRORS_SERVICE_BASE_URL: str = "http://localhost:8000"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    
    @property
    def ASYNC_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            # SQLAlchemy async requires the asyncpg driver scheme
            return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
            
        url = f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        if "neon.tech" in self.POSTGRES_SERVER:
            url += "?ssl=require"
        return url

settings = Settings()
