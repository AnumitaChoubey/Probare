from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.session import get_db
from backend.app.db.models.notification_template import NotificationTemplate

router = APIRouter(prefix="/admin/notification-templates", tags=["Admin Notifications"])

class TemplateCreateOrUpdate(BaseModel):
    code: str
    subject_template: str
    body_template: str
    is_active: bool = True

class TemplateResponse(BaseModel):
    code: str
    subject_template: str
    body_template: str
    version: int
    is_active: bool

    class Config:
        from_attributes = True

@router.get("", response_model=List[TemplateResponse])
def list_templates(db: Session = Depends(get_db)):
    """
    List all notification templates.
    """
    return db.query(NotificationTemplate).all()

@router.post("", response_model=TemplateResponse, status_code=201)
def create_or_update_template(payload: TemplateCreateOrUpdate, db: Session = Depends(get_db)):
    """
    Create or increment version of a notification template.
    """
    existing = db.query(NotificationTemplate).filter_by(code=payload.code).first()
    if existing:
        existing.subject_template = payload.subject_template
        existing.body_template = payload.body_template
        existing.is_active = payload.is_active
        existing.version += 1
        db.commit()
        db.refresh(existing)
        return existing
    else:
        template = NotificationTemplate(
            code=payload.code,
            subject_template=payload.subject_template,
            body_template=payload.body_template,
            version=1,
            is_active=payload.is_active,
        )
        db.add(template)
        db.commit()
        db.refresh(template)
        return template
