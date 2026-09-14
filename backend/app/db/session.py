from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

import ssl

# Create SSL context for Neon DB
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Determine connect args
connect_args = {}
if settings.ASYNC_DATABASE_URI.startswith("sqlite"):
    pass # SQLite doesn't need SSL or check_same_thread for aiosqlite
elif "neon.tech" in settings.POSTGRES_SERVER:
    connect_args["ssl"] = ssl_context

# Create async engine
engine = create_async_engine(
    settings.ASYNC_DATABASE_URI,
    echo=settings.DEBUG, # Print SQL queries in debug mode
    pool_pre_ping=True,
    connect_args=connect_args
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
