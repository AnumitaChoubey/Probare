from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.engine.url import make_url
from typing import AsyncGenerator, Tuple, Dict, Any
from .config import settings

def get_engine_config() -> Tuple[Any, Dict[str, Any]]:
    """Parse DATABASE_URL and extract SSL options for asyncpg compatibility."""
    url = make_url(settings.DATABASE_URL)
    connect_args = {}
    
    query = dict(url.query)
    ssl_mode = query.pop("sslmode", query.pop("ssl", None))
    
    if ssl_mode:
        if ssl_mode in ["require", "true", "1"]:
            connect_args["ssl"] = "require"
        elif ssl_mode != "disable":
            connect_args["ssl"] = ssl_mode
            
    clean_url = url.set(query=query)
    return clean_url, connect_args

db_url, db_connect_args = get_engine_config()

engine = create_async_engine(
    db_url,
    connect_args=db_connect_args,
    echo=False,
    future=True,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
