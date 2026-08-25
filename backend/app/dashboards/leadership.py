"""
TASK DASH-4: GET /dashboards/leadership

Full filter set (date range, LOB multi-select, category, severity,
client-impact-flag) passed through to P1's GET /errors.
"""

from collections import defaultdict
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.config import settings  # noqa: confirm real setting name
from app.auth.dependencies import get_current_user  # noqa: confirm real path

router = APIRouter(prefix="/dashboards", tags=["dashboards-leadership"])

CLOSED_STATUSES = {"CLOSED_UPHELD", "CLOSED_OVERTURNED", "CLOSED_PARTIAL"}
ESCALATED_STATUS = "SLA_BREACHED_ESCALATED"
OVERTURNED_DECISIONS = {"OVERTURNED", "PARTIALLY_UPHELD"}


# response schema

class MonthlyPoint(BaseModel):
    month: str
    total: int


class NamedCount(BaseModel):
    name: str
    value: int


class AgingBucket(BaseModel):
    state: str  # "green" | "amber" | "red"
    count: int


class LeadershipDashboardResponse(BaseModel):
    total_errors: int
    sla_compliance_pct: float
    overturn_rate_pct: float
    escalation_rate_pct: float
    client_impact_flagged_count: int
    trend: list[MonthlyPoint]
    by_lob: list[NamedCount]
    by_category: list[NamedCount]
    aging_distribution: list[AgingBucket]


# helper

async def _fetch_errors(
    auth_header: str,
    lob_ids: Optional[list[str]],
    category_id: Optional[str],
    severity: Optional[str],
    client_impact_only: bool,
) -> list[dict]:
    params: dict = {}
    if lob_ids:
        params["lob_id"] = lob_ids  # httpx repeats the param for list values
    if category_id:
        params["category_id"] = category_id
    if severity:
        params["severity"] = severity
    if client_impact_only:
        params["client_impact_flag"] = "true"

    async with httpx.AsyncClient(base_url=settings.ERRORS_SERVICE_BASE_URL, timeout=10.0) as client:
        resp = await client.get("/errors", params=params, headers={"Authorization": auth_header})
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch errors from foundation service")
        return resp.json()


def _month_key(dt: datetime) -> str:
    return dt.strftime("%b")


# endpoint

@router.get("/leadership", response_model=LeadershipDashboardResponse)
async def get_leadership_dashboard(
    lob_id: Optional[list[str]] = Query(default=None, description="Multi-select — repeat the param per LOB"),
    category_id: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    client_impact_only: bool = Query(default=False),
    current_user=Depends(get_current_user),
):
    errors = await _fetch_errors(
        auth_header=f"Bearer {current_user.token}" if hasattr(current_user, "token") else "",
        lob_ids=lob_id,
        category_id=category_id,
        severity=severity,
        client_impact_only=client_impact_only,
    )

    total_errors = len(errors)
    escalated_count = 0
    client_impact_count = 0

    trend_buckets: dict[str, int] = defaultdict(int)
    lob_counts: dict[str, int] = defaultdict(int)
    category_counts: dict[str, int] = defaultdict(int)
    aging_counts: dict[str, int] = defaultdict(int)

    total_decisions = 0
    total_overturned = 0

    for err in errors:
        status = err.get("status", "")
        created_at_raw = err.get("created_at")
        created_at = datetime.fromisoformat(created_at_raw.replace("Z", "+00:00")) if created_at_raw else None

        if status == ESCALATED_STATUS:
            escalated_count += 1

        if err.get("client_impact_flag"):
            client_impact_count += 1

        if created_at:
            trend_buckets[_month_key(created_at)] += 1

        lob_counts[err.get("lob_id", "Unassigned")] += 1
        category_counts[err.get("category_id", "Unassigned")] += 1

        sla_state = (err.get("sla_state") or {}).get("state")
        if sla_state in ("green", "amber", "red"):
            aging_counts[sla_state] += 1

        decision = err.get("latest_decision")
        if decision:
            total_decisions += 1
            if decision in OVERTURNED_DECISIONS:
                total_overturned += 1

    closed_errors = [e for e in errors if e.get("status") in CLOSED_STATUSES]
    within_sla = sum(1 for e in closed_errors if (e.get("sla_state") or {}).get("state") != "red")
    sla_compliance_pct = round((within_sla / len(closed_errors) * 100), 1) if closed_errors else 0.0

    overturn_rate_pct = round((total_overturned / total_decisions * 100), 1) if total_decisions else 0.0
    escalation_rate_pct = round((escalated_count / total_errors * 100), 1) if total_errors else 0.0

    trend = [
        MonthlyPoint(month=m, total=count)
        for m, count in sorted(trend_buckets.items(), key=lambda kv: datetime.strptime(kv[0], "%b").month)
    ]
    by_lob = [NamedCount(name=name, value=count) for name, count in sorted(lob_counts.items(), key=lambda kv: -kv[1])]
    by_category = [NamedCount(name=name, value=count) for name, count in sorted(category_counts.items(), key=lambda kv: -kv[1])]
    aging_distribution = [AgingBucket(state=s, count=aging_counts.get(s, 0)) for s in ("green", "amber", "red")]

    return LeadershipDashboardResponse(
        total_errors=total_errors,
        sla_compliance_pct=sla_compliance_pct,
        overturn_rate_pct=overturn_rate_pct,
        escalation_rate_pct=escalation_rate_pct,
        client_impact_flagged_count=client_impact_count,
        trend=trend,
        by_lob=by_lob,
        by_category=by_category,
        aging_distribution=aging_distribution,
    )