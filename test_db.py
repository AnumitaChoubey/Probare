import asyncio
import sqlalchemy.ext.asyncio as sa_async
import sqlalchemy as sa
from urllib.parse import urlparse

url = 'postgresql+asyncpg://neondb_owner:npg_yXqkK62EChlr@ep-still-union-ayxtgb0h-pooler.c-5.us-east-2.aws.neon.tech/neondb'
engine = sa_async.create_async_engine(url, connect_args={'ssl': 'require'})

async def test():
    try:
        async with engine.connect() as conn:
            res = await conn.execute(sa.text('SELECT count(*) FROM quality_events;'))
            print("Row count:", res.scalar())
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test())
