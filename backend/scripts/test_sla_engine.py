import asyncio
import logging
import uuid
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.jobs.sla_engine import run_sla_engine
from app.db.session import async_session_maker
from app.db.models.error import Error
from app.db.models.lob import Lob
from app.db.models.category import Category
from app.db.models.user import User
from sqlalchemy import select
from datetime import datetime, timedelta, timezone

logging.basicConfig(level=logging.INFO)

async def run_engine():
    print("Forcing SLA breach on an error...")
    
    async with async_session_maker() as db:
        # Get arbitrary lob/category/user
        lob = (await db.execute(select(Lob).limit(1))).scalar_one()
        cat = (await db.execute(select(Category).limit(1))).scalar_one()
        usr = (await db.execute(select(User).limit(1))).scalar_one()
        
        past = datetime.now(timezone.utc) - timedelta(hours=48)
        
        new_err = Error(
            id=uuid.uuid4(),
            qa_error_id=f"QE-TEST-{uuid.uuid4().hex[:6]}",
            lob_id=lob.id,
            category_id=cat.id,
            severity="HIGH",
            status="OPEN_PENDING_ACK",
            transaction_reference="TEST",
            logged_by_user_id=usr.id,
            date_of_occurrence=datetime.utcnow().date(),
            date_of_detection=datetime.utcnow().date(),
            description="Testing SLA background job",
            sla_rebuttal_window_hours_snapshot=24,
            sla_decision_window_hours_snapshot=48,
            sla_clock_started_at=past,
            is_draft=False
        )
        db.add(new_err)
        await db.commit()
        
        print(f"Created error {new_err.qa_error_id} to start 48 hours ago with a 24 hr window.")
        
    print("\nRunning SLA Engine...")
    await run_sla_engine()
    print("SLA Engine finished.\n")
    
    async with async_session_maker() as db:
        query = select(Error).where(Error.id == new_err.id)
        res = await db.execute(query)
        error = res.scalar_one()
        
        print(f"Final Status: {error.status}")
        print(f"Current Escalation Level: {error.current_escalation_level}")
        print(f"SLA State Dict: {error.sla_state}")

if __name__ == "__main__":
    asyncio.run(run_engine())
