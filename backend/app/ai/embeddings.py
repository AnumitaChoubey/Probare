import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import uuid

from app.core.config import settings

try:
    from openai import AsyncOpenAI
    has_openai = True
except ImportError:
    has_openai = False

async def get_embedding(text: str) -> list[float]:
    """Fetch embeddings from Azure OpenAI or mock it if offline/no key."""
    if not has_openai or not os.getenv("OPENAI_API_KEY"):
        # Mock 1536-dimensional vector for local/testing
        return [0.0] * 1536
        
    client = AsyncOpenAI()
    try:
        response = await client.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding failed: {e}")
        return [0.0] * 1536

async def check_and_store_duplicate(
    db: AsyncSession, 
    error_id: uuid.UUID, 
    lob_id: uuid.UUID, 
    description: str,
    threshold: float = 0.15
) -> list[str]:
    """
    Checks for duplicates in the central pgvector DB and stores the new embedding.
    Returns a list of warning strings if duplicates are found.
    """
    # Exclude if we are on the local SQLite DB
    if settings.SQLITE_DB_PATH:
        return []
        
    try:
        # Import inside to avoid crashing SQLite environments
        from app.db.models.ai import ErrorEmbedding
        from app.db.models.error import Error
        
        vector = await get_embedding(description)
        
        # We need to query vector distance
        # pgvector uses cosine distance via the `<=>` operator. 
        # threshold < 0.15 means they are 85%+ similar.
        
        warnings = []
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)
        
        # Build query for nearest neighbors
        # For simplicity and avoiding raw SQL compilation issues, we'll use a direct text query
        # or SQLAlchemy's vector support
        
        stmt = select(Error.qa_error_id, ErrorEmbedding.embedding.cosine_distance(vector).label('distance'))\
            .join(Error, Error.id == ErrorEmbedding.error_id)\
            .where(Error.lob_id == lob_id)\
            .where(ErrorEmbedding.computed_at > ninety_days_ago)\
            .where(Error.id != error_id)\
            .order_by(ErrorEmbedding.embedding.cosine_distance(vector))\
            .limit(5)
            
        result = await db.execute(stmt)
        neighbors = result.all()
        
        for qa_error_id, distance in neighbors:
            if distance < threshold:
                similarity_pct = int((1.0 - distance) * 100)
                warnings.append(f"Possible duplicate: {qa_error_id} ({similarity_pct}% similar)")
                
        # Store our new embedding
        new_emb = ErrorEmbedding(
            error_id=error_id,
            embedding=vector
        )
        db.add(new_emb)
        # Flush is handled by the caller commit
        
        return warnings
    except Exception as e:
        print(f"Vector search failed: {e}")
        return []
