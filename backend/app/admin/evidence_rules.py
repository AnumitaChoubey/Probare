from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List

from app.db.session import get_db
from app.db.models.evidence_rule import EvidenceRule
from app.auth.deps import get_current_user

router = APIRouter(prefix="/admin/evidence-rules", tags=["admin-evidence-rules"])

class EvidenceRuleResponse(BaseModel):
    max_file_size_bytes: int
    max_file_count_per_error: int
    allowed_file_types: List[str]

    class Config:
        from_attributes = True

class EvidenceRuleUpdate(BaseModel):
    max_file_size_bytes: int
    max_file_count_per_error: int
    allowed_file_types: List[str]

@router.get("", response_model=EvidenceRuleResponse)
async def get_evidence_rules(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    res = await db.execute(select(EvidenceRule).filter(EvidenceRule.id == 1))
    rule = res.scalar_one_or_none()
    if not rule:
        rule = EvidenceRule(id=1)
        db.add(rule)
        await db.commit()
        await db.refresh(rule)
    return rule

@router.patch("", response_model=EvidenceRuleResponse)
async def update_evidence_rules(
    payload: EvidenceRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if user has QA_ADMIN or OPS_MGR role (basic check)
    user_roles = {ur.role.code for ur in current_user.user_roles} if getattr(current_user, "user_roles", None) else set()
    if not user_roles.intersection({"QA_ADMIN", "SYS_ADMIN", "OPS_MGR"}):
        raise HTTPException(status_code=403, detail="Not authorized to edit evidence rules")
        
    res = await db.execute(select(EvidenceRule).filter(EvidenceRule.id == 1))
    rule = res.scalar_one_or_none()
    if not rule:
        rule = EvidenceRule(id=1)
        db.add(rule)
        
    rule.max_file_size_bytes = payload.max_file_size_bytes
    rule.max_file_count_per_error = payload.max_file_count_per_error
    rule.allowed_file_types = payload.allowed_file_types
    
    await db.commit()
    await db.refresh(rule)
    return rule
