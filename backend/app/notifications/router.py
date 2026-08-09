from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.models.in_app_notification import InAppNotification
from app.notifications.worker import notification_worker

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class TriggerNotificationRequest(BaseModel):
    template_code: str
    recipient_user_id: str
    recipient_email: str
    error_id: Optional[str] = None
    context: Optional[dict] = None

class InAppNotificationResponse(BaseModel):
    id: int
    user_id: str
    error_id: Optional[str] = None
    template_code: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/trigger", status_code=201)
def trigger_notification(payload: TriggerNotificationRequest, db: Session = Depends(get_db)):
    """
    Internal endpoint called by Person 1 / backend workflows to trigger a notification dispatch.
    """
    log_entry = notification_worker.process_trigger(
        db=db,
        template_code=payload.template_code,
        recipient_user_id=payload.recipient_user_id,
        recipient_email=payload.recipient_email,
        error_id=payload.error_id,
        context=payload.context or {},
    )
    return {
        "status": "triggered",
        "notification_log_id": log_entry.id,
        "email_status": log_entry.status,
    }

@router.get("", response_model=List[InAppNotificationResponse])
def list_notifications(
    unread_only: bool = Query(False),
    user_id: str = Query("user-default-1"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    List in-app notifications for the given user.
    """
    query = db.query(InAppNotification).filter(InAppNotification.user_id == user_id)
    if unread_only:
        query = query.filter(InAppNotification.is_read == False)
    
    notifications = query.order_by(InAppNotification.created_at.desc()).limit(limit).all()
    return notifications

@router.post("/mark-all-read")
def mark_all_read(
    user_id: str = Query("user-default-1"),
    db: Session = Depends(get_db),
):
    """
    Bulk mark all notifications as read for current user.
    """
    db.query(InAppNotification).filter(
        InAppNotification.user_id == user_id,
        InAppNotification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.post("/{notification_id}/read")
def mark_single_read(
    notification_id: int,
    user_id: str = Query("user-default-1"),
    db: Session = Depends(get_db),
):
    """
    Mark a single notification as read on click-through.
    """
    notif = db.query(InAppNotification).filter(
        InAppNotification.id == notification_id,
        InAppNotification.user_id == user_id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read", "id": notification_id}
