import asyncio
from app.core.database import AsyncSessionLocal
from app.main import health_ready

async def test():
    async with AsyncSessionLocal() as db:
        res = await health_ready(db)
        print("Health ready result:", res)

if __name__ == "__main__":
    asyncio.run(test())
