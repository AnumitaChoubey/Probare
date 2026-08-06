from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert
import datetime
from app.db.models.qa_error_id_sequence import QaErrorIdSequence
from app.db.models.lob import Lob

async def generate_qa_error_id(db: AsyncSession, lob_id: str) -> str:
    """
    Generates ID like QE-{LOBCODE}-{YYYY}-{SEQ6}.
    Example: QE-BILL-2026-000481
    """
    # 1. Fetch LOB code
    result = await db.execute(select(Lob.code).filter(Lob.id == lob_id))
    lob_code = result.scalar_one_or_none()
    if not lob_code:
        raise ValueError(f"Invalid lob_id: {lob_id}")
    
    # 2. Get current year
    current_year = datetime.datetime.utcnow().year
    
    # 3. Construct the sequence key
    seq_key = f"{lob_code}-{current_year}"
    
    # 4. Atomic increment using PostgreSQL UPSERT (INSERT ... ON CONFLICT DO UPDATE)
    # This acts like a sequence and handles concurrency safely.
    stmt = insert(QaErrorIdSequence).values(
        lob_year_key=seq_key,
        current_value=1
    ).on_conflict_do_update(
        index_elements=['lob_year_key'],
        set_=dict(current_value=QaErrorIdSequence.current_value + 1)
    ).returning(QaErrorIdSequence.current_value)
    
    # We must run this directly to get the returning value
    res = await db.execute(stmt)
    seq_val = res.scalar_one()
    
    # 5. Format the ID
    seq_str = f"{seq_val:06d}"
    return f"QE-{lob_code}-{current_year}-{seq_str}"
