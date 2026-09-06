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
    
    # Auth — REQUIRED in production: generate with `openssl rand -hex 32`
    # Never commit a real value here; always override via .env
    SECRET_KEY: str = "CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Internal Services
    ERRORS_SERVICE_BASE_URL: str = "http://localhost:8000"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    
    @property
    def ASYNC_DATABASE_URI(self) -> str:
        url = f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        if "neon.tech" in self.POSTGRES_SERVER:
            url += "?ssl=require"
        return url

settings = Settings()
