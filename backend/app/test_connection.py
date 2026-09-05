import asyncio
from app.db.session import engine

async def run_test_connection():
    async with engine.connect() as conn:
        print("✅ Connected successfully!")

if __name__ == "__main__":
    asyncio.run(run_test_connection())