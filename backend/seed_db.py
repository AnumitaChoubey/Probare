"""
Seed the Neon production database with 30 realistic quality events.
Handles all NOT NULL constraints in the quality_events table.
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_engine_config
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.models.core import User, ProjectMember, Team, UserIdentity
from app.models.quality import QualityEvent

CLERK_SUB = "user_3JXCd0Y2T5kCfHuSX0s1Jrzwfxb"

PROCESS_TAXONOMY = {
    'Payment Verification': {'sop': 'SOP-PAY-014', 'errors': ['Missing Secondary Auth', 'Skipped Payout Limit Check', 'Incorrect Routing Number']},
    'Identity Authentication': {'sop': 'SOP-SEC-102', 'errors': ['Unverified Caller Override', 'Expired ID Acceptance', 'Incomplete KYC Log']},
    'KYC & AML Compliance': {'sop': 'SOP-AML-009', 'errors': ['Sanctions False-Negative Override', 'Missing Source of Funds Form', 'Delayed AML Reporting']},
    'Fee Reversal': {'sop': 'SOP-FEE-022', 'errors': ['Discretionary Limit Exceeded', 'Missing Supervisor Approval', 'Duplicate Credit Issued']},
    'Transaction Dispute': {'sop': 'SOP-DSP-301', 'errors': ['Premature Dispute Dismissal', 'Chargeback Reason Code Mismatch', 'Exceeded Network Filing Timeframe']},
    'Wire Transfer': {'sop': 'SOP-WIR-402', 'errors': ['Callback Verification Omitted', 'SWIFT Code Transposition', 'Exceeded Daily Auth Cap']},
    'Billing Adjustments': {'sop': 'SOP-BIL-077', 'errors': ['Incorrect Effective Date', 'Missing Client Notification', 'Unapproved Ledger Entry']},
    'Credit Assessment': {'sop': 'SOP-CRD-210', 'errors': ['Outdated Bureau Report Used', 'Missing Adverse Action Code', 'Unsigned Credit Request']},
}

SUB_PROCESSES = ['Threshold Exceedance', 'Account Validation', 'Dual Authorization', 'Callback Verification', 'Document Review', 'Risk Screening', 'Limit Override', 'Compliance Check']
STATUSES = ['Logged', 'Under Review', 'Rebuttal Pending', 'QA Review', 'Escalated', 'Upheld', 'Corrective Action', 'Closed']
SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
CUSTOMER_IMPACTS = [
    'Direct regulatory reporting threshold triggered. Client funds held.',
    'Client contact required to rectify information. SLA delayed by >24h.',
    'Internal rework required. Customer was not directly impaired.',
    'Minor procedural deviation. No customer-facing impact.',
]

PROCESS_KEYS = list(PROCESS_TAXONOMY.keys())


async def seed():
    db_url, db_connect_args = get_engine_config()
    engine = create_async_engine(db_url, connect_args=db_connect_args)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 1. Find provisioned user
        uid_res = await session.execute(
            select(User).join(UserIdentity, UserIdentity.user_id == User.id)
            .filter(UserIdentity.provider == 'clerk', UserIdentity.provider_subject == CLERK_SUB)
        )
        user = uid_res.scalars().first()
        if not user:
            print("ERROR: User not provisioned. Run provision_me.py first.")
            return

        # 2. Get project
        pm_res = await session.execute(select(ProjectMember).filter_by(user_id=user.id))
        pm = pm_res.scalars().first()
        if not pm:
            print("ERROR: No project found for user.")
            return

        project_id = pm.project_id
        tenant_id = user.tenant_id
        owner_id = user.id
        print(f"Project ID: {project_id}")
        print(f"Tenant ID:  {tenant_id}")
        print(f"User ID:    {owner_id}")

        # 3. Check if already seeded
        existing = await session.execute(
            select(QualityEvent).filter_by(project_id=project_id).limit(1)
        )
        if existing.scalars().first():
            print("Data already seeded. Skipping. Delete rows manually to re-seed.")
            await engine.dispose()
            return

        # 4. Get or create a default team
        team_res = await session.execute(select(Team).filter_by(tenant_id=tenant_id).limit(1))
        team = team_res.scalars().first()
        if not team:
            team = Team(id=str(uuid.uuid4()), tenant_id=tenant_id, name="Default Team")
            session.add(team)
            await session.flush()
        team_id = team.id
        print(f"Team ID:    {team_id}")

        # 5. Seed 30 quality events
        events = []
        base_date = datetime.now(timezone.utc) - timedelta(days=30)

        for i in range(30):
            proc_key = PROCESS_KEYS[i % len(PROCESS_KEYS)]
            proc = PROCESS_TAXONOMY[proc_key]
            severity = SEVERITIES[i % len(SEVERITIES)]
            status = STATUSES[i % len(STATUSES)]
            error_type = proc['errors'][i % len(proc['errors'])]
            sub_proc = SUB_PROCESSES[i % len(SUB_PROCESSES)]
            customer_impact = CUSTOMER_IMPACTS[i % len(CUSTOMER_IMPACTS)]
            created_dt = base_date + timedelta(days=i, hours=(i % 8))

            ev = QualityEvent(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                project_id=project_id,
                event_number=f"QEMS-2026-{str(1000 + i).zfill(6)[-6:]}",
                title=f"{error_type} in {proc_key}",
                description=f"Observed {error_type} while executing {sub_proc} under {proc['sop']}. Frontline execution deviated from compliance standards during routine quality audit sampling.",
                employee_id=owner_id,
                team_id=team_id,
                process_id=proc_key,
                sub_process_id=sub_proc,
                error_type_id=error_type,
                sop_id=proc['sop'],
                severity=severity,
                status=status,
                owner_id=owner_id,
                created_by_id=owner_id,
                customer_impact=customer_impact,
                financial_impact=f"${1000 + i * 150:,}.00" if severity in ['CRITICAL', 'HIGH'] else None,
                version=1,
                created_at=created_dt,
                updated_at=created_dt,
            )
            events.append(ev)

        session.add_all(events)
        await session.commit()
        print(f"[OK] Seeded {len(events)} quality events successfully!")

    await engine.dispose()


asyncio.run(seed())
