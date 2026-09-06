"""
TASK DASH-3: GET /dashboards/operations
Calls Person 1's GET /errors (filtered to the caller's team via
owner_manager_user_id, resolved through your own ownership_mapping
data), and returns everything the Ops Dashboard frontend actually
renders i.e. KPI counts, monthly trend, severity breakdown, department
breakdown, escalation trend
"""
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from app.core.config import settings  # assumed: exposes ERRORS_SERVICE_BASE_URL
from app.auth.deps import get_current_user

router = APIRouter(prefix="/dashboards", tags=["dashboards-operations"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

CLOSED_STATUSES = {"CLOSED_UPHELD", "CLOSED_OVERTURNED", "CLOSED_PARTIAL"}
ESCALATED_STATUS = "SLA_BREACHED_ESCALATED"
OVERDUE_SLA_STATE = "red"

#Response schema

class MonthlyTrendPoint(BaseModel):
    month: str
    logged: int
    closed: int
    reopened: int


class SeveritySlice(BaseModel):
    name: str
    value: int


class DepartmentRow(BaseModel):
    dept: str
    open: int
    closed: int
    avg_resolution_days: float


class EscalationTrendPoint(BaseModel):
    month: str
    escalations: int


class OpsDashboardResponse(BaseModel):
    open_count: int
    closed_count: int
    overdue_count: int
    escalated_count: int
    avg_resolution_days: float
    sla_compliance_pct: float
    monthly_trend: list[MonthlyTrendPoint]
    severity_breakdown: list[SeveritySlice]
    department_breakdown: list[DepartmentRow]
    escalation_trend: list[EscalationTrendPoint]

# Helpers
def _month_key(dt: datetime) -> str:
    return dt.strftime("%b")  
async def _fetch_errors(auth_header: str, owner_manager_user_id: Optional[str]) -> list[dict]:
    
    params = {}
    if owner_manager_user_id:
        params["owner_manager_user_id"] = owner_manager_user_id

    async with httpx.AsyncClient(base_url=settings.ERRORS_SERVICE_BASE_URL, timeout=10.0) as client:
        resp = await client.get("/errors", params=params, headers={"Authorization": auth_header})
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch errors from foundation service")
        return resp.json()


#Endpoint

@router.get("/operations", response_model=OpsDashboardResponse)
async def get_operations_dashboard(
    current_user=Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
):
    
    errors = await _fetch_errors(
    auth_header=f"Bearer {token}",
    owner_manager_user_id=str(current_user.id),
)

    open_count = 0
    closed_count = 0
    overdue_count = 0
    escalated_count = 0

    resolution_days: list[float] = []

    trend_buckets: dict[str, dict[str, int]] = defaultdict(lambda: {"logged": 0, "closed": 0, "reopened": 0})
    severity_counts: dict[str, int] = defaultdict(int)
    dept_buckets: dict[str, dict[str, list]] = defaultdict(lambda: {"open": 0, "closed": 0, "resolution_days": []})
    escalation_trend_buckets: dict[str, int] = defaultdict(int)

    for err in errors:
        status = err.get("status", "")
        severity = err.get("severity", "UNKNOWN")
        sla_state = (err.get("sla_state") or {}).get("state")
        lob = err.get("lob_id", "Unassigned")

        created_at = datetime.fromisoformat(err["created_at"].replace("Z", "+00:00")) if err.get("created_at") else None
        closed_at = datetime.fromisoformat(err["closed_at"].replace("Z", "+00:00")) if err.get("closed_at") else None

        is_closed = status in CLOSED_STATUSES
        is_escalated = status == ESCALATED_STATUS

        if is_closed:
            closed_count += 1
        else:
            open_count += 1
            if sla_state == OVERDUE_SLA_STATE:
                overdue_count += 1

        if is_escalated:
            escalated_count += 1
            if created_at:
                escalation_trend_buckets[_month_key(created_at)] += 1

        if is_closed and created_at and closed_at:
            days = (closed_at - created_at).total_seconds() / 86400
            resolution_days.append(days)

        severity_counts[severity] += 1

        if created_at:
            trend_buckets[_month_key(created_at)]["logged"] += 1
        if is_closed and closed_at:
            trend_buckets[_month_key(closed_at)]["closed"] += 1
        

        dept_buckets[lob]["open" if not is_closed else "closed"] += 1
        if is_closed and created_at and closed_at:
            dept_buckets[lob]["resolution_days"].append((closed_at - created_at).total_seconds() / 86400)

    avg_resolution = sum(resolution_days) / len(resolution_days) if resolution_days else 0.0

    
    closed_errors = [e for e in errors if e.get("status") in CLOSED_STATUSES]
    within_sla = sum(1 for e in closed_errors if (e.get("sla_state") or {}).get("state") != "red")
    sla_compliance_pct = round((within_sla / len(closed_errors) * 100), 1) if closed_errors else 0.0

    monthly_trend = [
        MonthlyTrendPoint(month=m, logged=v["logged"], closed=v["closed"], reopened=v["reopened"])
        for m, v in sorted(trend_buckets.items(), key=lambda kv: datetime.strptime(kv[0], "%b").month)
    ]

    severity_breakdown = [SeveritySlice(name=name, value=count) for name, count in severity_counts.items()]

    department_breakdown = [
        DepartmentRow(
            dept=dept,
            open=v["open"],
            closed=v["closed"],
            avg_resolution_days=round(sum(v["resolution_days"]) / len(v["resolution_days"]), 1) if v["resolution_days"] else 0.0,
        )
        for dept, v in dept_buckets.items()
    ]

    escalation_trend = [
        EscalationTrendPoint(month=m, escalations=count)
        for m, count in sorted(escalation_trend_buckets.items(), key=lambda kv: datetime.strptime(kv[0], "%b").month)
    ]

    return OpsDashboardResponse(
        open_count=open_count,
        closed_count=closed_count,
        overdue_count=overdue_count,
        escalated_count=escalated_count,
        avg_resolution_days=round(avg_resolution, 1),
        sla_compliance_pct=sla_compliance_pct,
        monthly_trend=monthly_trend,
        severity_breakdown=severity_breakdown,
        department_breakdown=department_breakdown,
        escalation_trend=escalation_trend,
    )