import asyncio
import os
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.tenant import Tenant, Project
from app.models.quality_event import QualityEvent, RCA, CAPA

import sys

# Avoid using truncate or reset; only insert if empty.

async def seed_data():
    if os.getenv("APPLICATION_ENV") == "production":
        print("ERROR: Database seeding is strictly disabled in production environments.")
        sys.exit(1)

    engine = create_async_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with AsyncSessionLocal() as session:
        # Check if Tenant already exists
        result = await session.execute(select(Tenant).limit(1))
        existing_tenant = result.scalar_one_or_none()
        
        if existing_tenant:
            print("Data already exists. Seeding skipped.")
            return

        print("Seeding database...")
        
        # 1. Create Tenant
        tenant = Tenant(id="default-tenant", name="Default Organization")
        session.add(tenant)
        await session.commit()
        
        # 2. Create Project
        project = Project(
            id="default-project",
            tenant_id="default-tenant",
            name="Default Project",
            description="Default Seeded Project"
        )
        session.add(project)
        await session.commit()

        # 3. Create Quality Events
        now = datetime.now(timezone.utc)
        
        roles = ["Frontline Employee", "QA Auditor", "QA Reviewer", "QA Manager"]
        statuses = ["Logged", "Under Review", "QA Review", "Corrective Action", "Effectiveness Review", "Closed"]
        teams = ["Payment Operations", "Claims Adjudication", "KYC & Identity", "Customer Support"]
        
        for i in range(1, 51):
            status = random.choice(statuses)
            created_at = now - timedelta(days=random.randint(1, 30))
            
            event = QualityEvent(
                id=f"QEMS-2026-{1000 + i}",
                project_id="default-project",
                tenant_id="default-tenant",
                title=f"Sample Quality Event {i}",
                description=f"This is a detailed description of the seeded quality event {i}.",
                employee="Seed Employee",
                employee_id="EMP-100",
                team=random.choice(teams),
                process_area="Payment Verification",
                sub_category="Procedural Compliance",
                error_type="Missing Verification",
                severity=random.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
                status=status,
                owner="Seed User",
                created_by="Seed User",
                sla_status="On Track",
                sla_due_date=created_at + timedelta(hours=48),
                sop_id="SOP-PAY-014",
                customer_impact="Financial Delay",
                financial_impact=random.randint(0, 5000),
                created_at=created_at,
                updated_at=created_at
            )
            session.add(event)
            await session.commit()
            
            # Optional RCA
            if status in ["Corrective Action", "Effectiveness Review", "Closed"]:
                rca = RCA(
                    event_id=event.id,
                    project_id="default-project",
                    tenant_id="default-tenant",
                    five_whys=["Why 1", "Why 2", "Why 3", "Why 4", "Why 5"],
                    fishbone_category="Process",
                    primary_category="SOP Ambiguity",
                    contributing_factors=["Factor 1"],
                    recurrence_risk="Medium",
                    preventative_measure="Updated documentation",
                    completed_by="Seed User",
                    created_at=created_at + timedelta(days=1)
                )
                session.add(rca)
                
            # Optional CAPA
            if status in ["Effectiveness Review", "Closed"]:
                capa = CAPA(
                    event_id=event.id,
                    project_id="default-project",
                    tenant_id="default-tenant",
                    title="Documentation Update",
                    description="Update the SOP to include edge cases.",
                    owner="Seed User",
                    priority="HIGH",
                    due_date=created_at + timedelta(days=14),
                    status="Completed",
                    type="Process Update",
                    verification_method="Audit",
                    evidence_required=["SOP PDF"],
                    created_at=created_at + timedelta(days=2)
                )
                session.add(capa)

        await session.commit()
        print("Database seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed_data())
