import asyncio
import sqlalchemy.ext.asyncio as sa_async
from app.models import Base
from app.core.database import get_engine_config

async def create_schema():
    db_url, db_connect_args = get_engine_config()
    print(f"Connecting to {db_url}")
    engine = sa_async.create_async_engine(db_url, connect_args=db_connect_args)
    
    async with engine.begin() as conn:
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully.")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_schema())
