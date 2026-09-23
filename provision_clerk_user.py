"""
Manual user provisioning script.
Run this once to create your Clerk user in the production Neon database.
Usage: python provision_clerk_user.py <clerk_sub> <email> <name>
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from app.core.database import get_engine_config
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.services.auth_service import AuthService


async def provision(provider_subject: str, email: str, name: str):
    db_url, db_connect_args = get_engine_config()
    engine = create_async_engine(db_url, connect_args=db_connect_args)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if already exists
        existing = await AuthService.get_user_by_identity(session, "clerk", provider_subject)
        if existing:
            print(f"✅ User already provisioned: {existing.id}")
            # Print project info
            from sqlalchemy.future import select
            from app.models.core import ProjectMember
            pm_res = await session.execute(select(ProjectMember).filter_by(user_id=existing.id))
            pms = pm_res.scalars().all()
            for pm in pms:
                print(f"   Project: {pm.project_id}")
            return

        print(f"Provisioning new Clerk user: {provider_subject}")
        user = await AuthService.register_clerk_identity(session, provider_subject, email, name)
        await session.commit()
        print(f"✅ User provisioned successfully!")
        print(f"   User ID:   {user.id}")
        print(f"   Tenant ID: {user.tenant_id}")

        # Print project
        from sqlalchemy.future import select
        from app.models.core import ProjectMember
        pm_res = await session.execute(select(ProjectMember).filter_by(user_id=user.id))
        pms = pm_res.scalars().all()
        for pm in pms:
            print(f"   Project:   {pm.project_id}")

    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python provision_clerk_user.py <clerk_sub> <email> <name>")
        print("\nTo find your Clerk sub, open browser DevTools on the app,")
        print("go to Network tab, click any API call, look at the Authorization header,")
        print("and decode the JWT at jwt.io - the 'sub' field is your Clerk sub ID.")
        sys.exit(1)

    asyncio.run(provision(sys.argv[1], sys.argv[2], sys.argv[3]))
