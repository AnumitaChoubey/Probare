from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

import ssl

# Create SSL context for Neon DB
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Create async engine
engine = create_async_engine(
    settings.ASYNC_DATABASE_URI,
    echo=settings.DEBUG, # Print SQL queries in debug mode
    pool_pre_ping=True,
    connect_args={"ssl": ssl_context} if "neon.tech" in settings.POSTGRES_SERVER else {}
)

# Create session maker
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def get_db() -> AsyncSession:
    """FastAPI Dependency for database sessions."""
    async with async_session_maker() as session:
        yield session
