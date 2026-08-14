import logging
import httpx
from datetime import datetime
from sqlalchemy.future import select

from app.db.session import async_session_maker
from app.db.models.error import Error
from app.db.models.error_status_history import ErrorStatusHistory
from app.db.models.user import User

logger = logging.getLogger(__name__)

async def run_sla_engine():
    """
    Background job that evaluates SLA states for all open errors.
    Transitions breached errors and triggers escalations and notifications.
    """
    logger.info("Running SLA Engine Background Job...")
    
    async with async_session_maker() as db:
        open_statuses = [
            "OPEN_PENDING_ACK", 
            "OPEN_PENDING_RESPONSE", 
            "SLA_BREACHED_ESCALATED", 
            "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW",
            "REOPENED"
        ]
        
        query = select(Error).where(Error.status.in_(open_statuses))
        result = await db.execute(query)
        errors = result.scalars().all()
        
        now = datetime.utcnow()
        
        async with httpx.AsyncClient(timeout=10.0, base_url="http://localhost:8000") as client:
            for error in errors:
                state_data = error.sla_state
                pct = state_data["elapsed_pct"]
                
                if pct >= 100.0 and error.status != "SLA_BREACHED_ESCALATED" and not error.status.startswith("CLOSED"):
                    logger.info(f"Error {error.qa_error_id} breached SLA! Transitioning to SLA_BREACHED_ESCALATED.")
                    
                    old_status = error.status
                    error.status = "SLA_BREACHED_ESCALATED"
                    error.current_escalation_level = 1
                    error.updated_at = now
                    
                    history = ErrorStatusHistory(
                        error_id=error.id,
                        from_status=old_status,
                        to_status=error.status,
                        performed_by_user_id=None,
                        performed_by_system=True,
                        reason="Automated SLA Breach Transition",
                        occurred_at=now
                    )
                    db.add(history)
                    
                    # Notify owner of initial breach
                    recipient_id = str(error.owner_user_id) if error.owner_user_id else "unassigned"
                    await notify_escalation(
                        client, 
                        qa_error_id=error.qa_error_id, 
                        level=1,
                        recipient_id=recipient_id,
                        recipient_email=f"{recipient_id}@probare.com"
                    )
                    
                elif error.status == "SLA_BREACHED_ESCALATED":
                    matrix = await get_escalation_matrix(client, str(error.lob_id))
                    
                    elapsed_hours = pct / 100.0 * (error.sla_rebuttal_window_hours_snapshot if error.sla_rebuttal_window_hours_snapshot > 0 else 1.0)
                    
                    new_level = error.current_escalation_level
                    new_recipient_id = None
                    
                    for level_rule in matrix:
                        threshold = level_rule.get("threshold_hours_after_breach", 9999)
                        level_num = level_rule.get("escalation_level", 0)
                        
                        if elapsed_hours >= threshold:
                            if level_num > new_level:
                                new_level = level_num
                                new_recipient_id = level_rule.get("recipient_user_id")
                                
                    if new_level > error.current_escalation_level:
                        logger.info(f"Error {error.qa_error_id} escalating to level {new_level}.")
                        error.current_escalation_level = new_level
                        error.updated_at = now
                        
                        recip_id = str(new_recipient_id) if new_recipient_id else "manager"
                        
                        await notify_escalation(
                            client, 
                            qa_error_id=error.qa_error_id, 
                            level=new_level,
                            recipient_id=recip_id,
                            recipient_email=f"{recip_id}@probare.com"
                        )
                        
        await db.commit()
        
async def get_escalation_matrix(client: httpx.AsyncClient, lob_id: str) -> list:
    try:
        resp = await client.get("/admin/escalation-matrix", params={"lob_id": lob_id})
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        logger.warning(f"Failed to fetch escalation matrix: {e}")
    return []

async def notify_escalation(client: httpx.AsyncClient, qa_error_id: str, level: int, recipient_id: str, recipient_email: str):
    try:
        payload = {
            "template_code": "SLA_BREACH" if level == 1 else "ESCALATION",
            "recipient_user_id": recipient_id,
            "recipient_email": recipient_email,
            "error_id": qa_error_id,
            "context": {
                "escalation_level": level,
                "message": f"SLA Breached! Escalated to level {level}"
            }
        }
        resp = await client.post("/notifications/trigger", json=payload)
        resp.raise_for_status()
        logger.info(f"Notification sent successfully for {qa_error_id}")
    except Exception as e:
        logger.warning(f"Unexpected error notifying for {qa_error_id}: {e}")
