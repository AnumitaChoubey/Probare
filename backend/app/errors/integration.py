import httpx
from fastapi import Request
import uuid
import logging

logger = logging.getLogger(__name__)

async def get_ownership_mapping(request: Request, lob_id: uuid.UUID, category_id: uuid.UUID) -> uuid.UUID | None:
    """Calls P4's endpoint to get owner."""
    url = f"{request.base_url}admin/ownership-mapping"
    params = {"lob_id": str(lob_id), "category_id": str(category_id)}
    
    # We must pass the Authorization header because P4's endpoints require auth
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    # P4's endpoint returns a list of mappings. We take the first one.
                    return uuid.UUID(data[0]["default_owner_user_id"])
    except Exception as e:
        logger.error(f"Failed to fetch ownership mapping: {e}")
    
    return None

async def get_sla_rules(request: Request, lob_id: uuid.UUID, category_id: uuid.UUID, severity: str) -> dict:
    """Calls P4's endpoint to get SLA snapshot."""
    url = f"{request.base_url}admin/sla-rules"
    params = {"lob_id": str(lob_id), "category_id": str(category_id), "severity": severity}
    
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    rule = data[0]
                    return {
                        "rebuttal_hours": rule.get("rebuttal_window_hours", 24),
                        "decision_hours": rule.get("decision_window_hours", 48)
                    }
    except Exception as e:
        logger.error(f"Failed to fetch SLA rules: {e}")
        
    return {"rebuttal_hours": 24, "decision_hours": 48} # Fallback defaults
