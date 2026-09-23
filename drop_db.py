import asyncio
import sqlalchemy.ext.asyncio as sa_async
import sqlalchemy as sa

url = 'postgresql+asyncpg://neondb_owner:npg_yXqkK62EChlr@ep-still-union-ayxtgb0h-pooler.c-5.us-east-2.aws.neon.tech/neondb'
engine = sa_async.create_async_engine(url, connect_args={'ssl': 'require'})

async def drop_all():
    async with engine.begin() as conn:
        print("Dropping all existing public tables...")
        await conn.execute(sa.text("""
        DO $$ DECLARE
            r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
        """))
        print("Done dropping tables.")

if __name__ == "__main__":
    asyncio.run(drop_all())
