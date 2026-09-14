import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid
import os

from app.db.session import get_db
from app.db.models.ai import AISuggestionLog
from app.db.models.category import Category
from app.db.models.sub_category import SubCategory
# openai might not be configured, so handle gracefully
try:
    from openai import AsyncOpenAI
    has_openai = True
except ImportError:
    has_openai = False

router = APIRouter(prefix="/ai", tags=["AI Insights"])

class SuggestionRequest(BaseModel):
    description: str

class SuggestionResponse(BaseModel):
    category_id: Optional[uuid.UUID] = None
    sub_category_id: Optional[uuid.UUID] = None
    severity: Optional[str] = None
    confidence: float
    log_id: int

@router.post("/suggest-classification", response_model=Optional[SuggestionResponse])
async def suggest_classification(
    req: SuggestionRequest,
    db: AsyncSession = Depends(get_db)
):
    if len(req.description) < 20:
        return None
        
    if not has_openai or not os.getenv("OPENAI_API_KEY"):
        # Mock behavior for development without OpenAI key
        log_entry = AISuggestionLog(
            suggestion_type="CLASSIFICATION",
            suggested_value={"mock": True},
            was_accepted=None
        )
        db.add(log_entry)
        await db.commit()
        return None

    # Fetch active categories for the prompt
    cats = await db.execute(select(Category).where(Category.is_active == True))
    active_categories = [{"id": str(c.id), "name": c.name} for c in cats.scalars().all()]
    
    subcats = await db.execute(select(SubCategory).where(SubCategory.is_active == True))
    active_subcategories = [{"id": str(s.id), "name": s.name, "category_id": str(s.category_id)} for s in subcats.scalars().all()]
    
    client = AsyncOpenAI()
    
    prompt = f"""
    You are an AI assistant categorizing quality errors based on a description.
    Active Categories: {json.dumps(active_categories)}
    Active Subcategories: {json.dumps(active_subcategories)}
    
    Analyze the following error description and return exactly ONE JSON object containing:
    - category_id (UUID string)
    - sub_category_id (UUID string)
    - severity (LOW, MEDIUM, HIGH, CRITICAL)
    - confidence (float between 0.0 and 1.0)
    
    Description:
    {req.description}
    """
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": "You output only valid JSON."},
                {"role": "user", "content": prompt}
            ]
        )
        
        result_str = response.choices[0].message.content
        result_json = json.loads(result_str)
        
        confidence = float(result_json.get("confidence", 0.0))
        if confidence < 0.5:
            return None
            
        log_entry = AISuggestionLog(
            suggestion_type="CLASSIFICATION",
            suggested_value=result_json,
            was_accepted=None
        )
        db.add(log_entry)
        await db.commit()
        
        return SuggestionResponse(
            category_id=uuid.UUID(result_json["category_id"]) if result_json.get("category_id") else None,
            sub_category_id=uuid.UUID(result_json["sub_category_id"]) if result_json.get("sub_category_id") else None,
            severity=result_json.get("severity"),
            confidence=confidence,
            log_id=log_entry.id
        )
    except Exception as e:
        print(f"AI Suggestion Error: {e}")
        return None
