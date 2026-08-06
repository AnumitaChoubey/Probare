import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from sqlalchemy import text

async def test_connection():
    try:
        db_url = str(settings.ASYNC_DATABASE_URI)
        print(f"Connecting to: {db_url.replace(settings.POSTGRES_PASSWORD, '***')}")
        engine = create_async_engine(db_url, echo=False)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1;"))
            print("Successfully connected to the database!")
            print(result.scalar())
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
