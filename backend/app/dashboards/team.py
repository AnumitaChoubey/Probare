"""
TASK DASH-2: GET /dashboards/team
Calls Person 1's GET /errors (filtered by lob_id), computes:
SLA compliance %, overturn rate by auditor, escalation counts, and
the Unmapped Errors queue (owner_user_id IS NULL).
"""

from collections import defaultdict
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.config import settings  # noqa: confirm real setting name, see operations.py
from app.auth.deps import get_current_user

router = APIRouter(prefix="/dashboards", tags=["dashboards-team"])

CLOSED_STATUSES = {"CLOSED_UPHELD", "CLOSED_OVERTURNED", "CLOSED_PARTIAL"}
ESCALATED_STATUS = "SLA_BREACHED_ESCALATED"
OVERTURNED_DECISIONS = {"OVERTURNED", "PARTIALLY_UPHELD"}


#response schema 

class OverturnByAuditor(BaseModel):
    name: str
    rate: float  #percentage


class UnmappedError(BaseModel):
    id: str
    category: str
    severity: str
    logged_by: str
    date: str


class TeamDashboardResponse(BaseModel):
    sla_compliance_pct: float
    escalated_count: int
    open_count: int
    overturn_rate_pct: float
    avg_time_to_close_days: float
    overturn_by_auditor: list[OverturnByAuditor]
    unmapped_errors: list[UnmappedError]


# helper

async def _fetch_errors(auth_header: str, lob_id: Optional[str]) -> list[dict]:
    params = {}
    if lob_id:
        params["lob_id"] = lob_id

    async with httpx.AsyncClient(base_url=settings.ERRORS_SERVICE_BASE_URL, timeout=10.0) as client:
        resp = await client.get("/errors", params=params, headers={"Authorization": auth_header})
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch errors from foundation service")
        return resp.json()


# endpoint

@router.get("/team", response_model=TeamDashboardResponse)
async def get_team_dashboard(
    lob_id: Optional[str] = Query(default=None),
    current_user=Depends(get_current_user),
):
    errors = await _fetch_errors(
        auth_header=f"Bearer {current_user.token}" if hasattr(current_user, "token") else "",
        lob_id=lob_id,
    )

    open_count = 0
    escalated_count = 0
    resolution_days: list[float] = []

    auditor_totals: dict[str, int] = defaultdict(int)
    auditor_overturned: dict[str, int] = defaultdict(int)

    unmapped: list[UnmappedError] = []

    total_decisions = 0
    total_overturned = 0

    for err in errors:
        status = err.get("status", "")
        created_at_raw = err.get("created_at")
        closed_at_raw = err.get("closed_at")
        created_at = datetime.fromisoformat(created_at_raw.replace("Z", "+00:00")) if created_at_raw else None
        closed_at = datetime.fromisoformat(closed_at_raw.replace("Z", "+00:00")) if closed_at_raw else None

        is_closed = status in CLOSED_STATUSES

        if not is_closed:
            open_count += 1
        if status == ESCALATED_STATUS:
            escalated_count += 1

        if is_closed and created_at and closed_at:
            resolution_days.append((closed_at - created_at).total_seconds() / 86400)

        
        logged_by = err.get("logged_by_name") or err.get("logged_by_user_id") or "Unknown"
        decision = err.get("latest_decision")
        if decision:
            total_decisions += 1
            auditor_totals[logged_by] += 1
            if decision in OVERTURNED_DECISIONS:
                total_overturned += 1
                auditor_overturned[logged_by] += 1

        if err.get("owner_user_id") is None:
            unmapped.append(UnmappedError(
                id=err.get("id", ""),
                category=err.get("category_id", "Unknown"),
                severity=err.get("severity", "Unknown"),
                logged_by=logged_by,
                date=(created_at.strftime("%Y-%m-%d") if created_at else ""),
            ))

    avg_time_to_close = sum(resolution_days) / len(resolution_days) if resolution_days else 0.0

    closed_errors = [e for e in errors if e.get("status") in CLOSED_STATUSES]
    within_sla = sum(1 for e in closed_errors if (e.get("sla_state") or {}).get("state") != "red")
    sla_compliance_pct = round((within_sla / len(closed_errors) * 100), 1) if closed_errors else 0.0

    overturn_rate_pct = round((total_overturned / total_decisions * 100), 1) if total_decisions else 0.0

    overturn_by_auditor = [
        OverturnByAuditor(
            name=name,
            rate=round((auditor_overturned.get(name, 0) / total * 100), 1),
        )
        for name, total in sorted(auditor_totals.items(), key=lambda kv: -auditor_overturned.get(kv[0], 0))
    ]

    return TeamDashboardResponse(
        sla_compliance_pct=sla_compliance_pct,
        escalated_count=escalated_count,
        open_count=open_count,
        overturn_rate_pct=overturn_rate_pct,
        avg_time_to_close_days=round(avg_time_to_close, 1),
        overturn_by_auditor=overturn_by_auditor,
        unmapped_errors=unmapped,
    )