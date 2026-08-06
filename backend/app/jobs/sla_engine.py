import logging
import httpx
from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.session import async_session_maker
from app.db.models.error import Error
from app.db.models.error_status_history import ErrorStatusHistory
from app.core.config import settings

logger = logging.getLogger(__name__)

async def run_sla_engine():
    """
    Background job that evaluates SLA states for all open errors.
    Transitions breached errors and triggers escalations and notifications.
    """
    logger.info("Running SLA Engine Background Job...")
    
    # We must use a context manager to get a fresh session for the background job
    async with async_session_maker() as db:
        # Fetch all open errors
        # Open statuses are those that are pending action
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
        
        # We will share an httpx client for the batch of escalations/notifications
        async with httpx.AsyncClient(timeout=10.0, base_url="http://localhost:8000") as client:
            for error in errors:
                state_data = error.sla_state
                pct = state_data["elapsed_pct"]
                
                # Check for initial breach
                if pct >= 100.0 and error.status != "SLA_BREACHED_ESCALATED" and not error.status.startswith("CLOSED"):
                    logger.info(f"Error {error.qa_error_id} breached SLA! Transitioning to SLA_BREACHED_ESCALATED.")
                    
                    old_status = error.status
                    error.status = "SLA_BREACHED_ESCALATED"
                    error.current_escalation_level = 1
                    error.updated_at = now
                    
                    # Add history
                    history = ErrorStatusHistory(
                        error_id=error.id,
                        from_status=old_status,
                        to_status=error.status,
                        performed_by_user_id=None, # System action
                        performed_by_system=True,
                        reason="Automated SLA Breach Transition",
                        occurred_at=now
                    )
                    db.add(history)
                    
                    # Try Notification
                    await notify_escalation(client, error.qa_error_id, 1)
                    
                # Check for continued escalation if already breached
                elif error.status == "SLA_BREACHED_ESCALATED":
                    # Get the escalation matrix for this LOB
                    matrix = await get_escalation_matrix(client, str(error.lob_id))
                    
                    # Matrix is sorted by level. Find the highest level where threshold < elapsed_hours
                    elapsed_hours = pct / 100.0 * (error.sla_rebuttal_window_hours_snapshot if error.sla_rebuttal_window_hours_snapshot > 0 else 1.0)
                    
                    new_level = error.current_escalation_level
                    for level_rule in matrix:
                        if elapsed_hours >= level_rule.get("threshold_hours", 9999):
                            if level_rule["level"] > new_level:
                                new_level = level_rule["level"]
                                
                    if new_level > error.current_escalation_level:
                        logger.info(f"Error {error.qa_error_id} escalating to level {new_level}.")
                        error.current_escalation_level = new_level
                        error.updated_at = now
                        await notify_escalation(client, error.qa_error_id, new_level)
                        
        await db.commit()
        
async def get_escalation_matrix(client: httpx.AsyncClient, lob_id: str) -> list:
    """Fetch escalation matrix from P4's endpoints."""
    try:
        resp = await client.get("/admin/escalation-matrix", params={"lob_id": lob_id})
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        logger.warning(f"Failed to fetch escalation matrix: {e}")
    return []

async def notify_escalation(client: httpx.AsyncClient, qa_error_id: str, level: int):
    """Trigger P3's notification API robustly."""
    try:
        payload = {
            "qa_error_id": qa_error_id,
            "event": "ESCALATION",
            "escalation_level": level,
            "message": f"SLA Breached! Escalated to level {level}"
        }
        # The user requested we catch any failure (connection refused, timeout, 500, 404, etc.)
        # and just log a warning instead of crashing.
        resp = await client.post("/notifications", json=payload)
        resp.raise_for_status()
        logger.info(f"Notification sent successfully for {qa_error_id}")
    except httpx.HTTPStatusError as e:
        logger.warning(f"Notification API returned HTTP {e.response.status_code} for {qa_error_id}")
    except httpx.RequestError as e:
        logger.warning(f"Notification API request failed ({type(e).__name__}) for {qa_error_id}")
    except Exception as e:
        logger.warning(f"Unexpected error notifying for {qa_error_id}: {e}")
