import asyncio
from app.db.session import engine

async def test():
    async with engine.connect() as conn:
        print("✅ Connected successfully!")

asyncio.run(test())