from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.meta import SLAPolicy

class SLAService:
    """
    Service for calculating SLA due dates and statuses.
    All times must be timezone-aware (UTC).
    """

    # Default SLA thresholds in hours based on severity
    # explicitly marked as fallback
    FALLBACK_POLICY_HOURS = {
        "Critical": 4,
        "High": 24,
        "Medium": 72,
        "Low": 168, # 7 days
    }

    FALLBACK_WARNING_THRESHOLD_PERCENT = 75 # 25% time left -> warning/due soon
    FALLBACK_AT_RISK_THRESHOLD = 0.20 # 20% time left -> at risk

    @classmethod
    async def get_policy(
        cls, 
        session: AsyncSession, 
        tenant_id: str, 
        process_id: str, 
        severity: str
    ) -> Optional[SLAPolicy]:
        """Fetch the SLA policy from the database based on process and severity."""
        stmt = select(SLAPolicy).filter_by(
            tenant_id=tenant_id, 
            process_id=process_id, 
            severity=severity
        )
        result = await session.execute(stmt)
        policy = result.scalars().first()
        
        if not policy:
            # Try to fetch process default (severity is None)
            stmt = select(SLAPolicy).filter_by(
                tenant_id=tenant_id, 
                process_id=process_id, 
                severity=None
            )
            result = await session.execute(stmt)
            policy = result.scalars().first()
            
        return policy

    @classmethod
    async def calculate_due_date(
        cls, 
        session: AsyncSession, 
        created_at: datetime, 
        tenant_id: str, 
        process_id: str, 
        severity: str
    ) -> Tuple[datetime, bool]:
        """
        Calculate SLA due date based on DB policy. 
        Returns (due_date, is_fallback)
        """
        policy = await cls.get_policy(session, tenant_id, process_id, severity)
        
        if policy and policy.resolution_target_hours is not None:
            return created_at + timedelta(hours=policy.resolution_target_hours), False
            
        # Fallback behavior
        hours = cls.FALLBACK_POLICY_HOURS.get(severity, 72) # Default 72h
        return created_at + timedelta(hours=hours), True

    @classmethod
    def calculate_status(
        cls, 
        created_at: datetime, 
        due_at: datetime, 
        closed_at: Optional[datetime], 
        current_time: Optional[datetime] = None,
        policy: Optional[SLAPolicy] = None,
        explicit_state: Optional[str] = None
    ) -> str:
        """
        Calculates the real-time SLA status.
        Valid states: ON_TRACK, DUE_SOON, AT_RISK, BREACHED, COMPLETED, PAUSED, CANCELLED
        """
        if explicit_state in ["PAUSED", "CANCELLED"]:
            return explicit_state

        if not current_time:
            current_time = datetime.now(timezone.utc)

        if closed_at:
            if closed_at <= due_at:
                return "COMPLETED"
            else:
                return "BREACHED" # Breached but closed

        if current_time > due_at:
            return "BREACHED"

        total_duration = (due_at - created_at).total_seconds()
        remaining_duration = (due_at - current_time).total_seconds()
        
        # Determine thresholds
        at_risk_threshold_fraction = cls.FALLBACK_AT_RISK_THRESHOLD
        due_soon_threshold_fraction = 1.0 - (cls.FALLBACK_WARNING_THRESHOLD_PERCENT / 100.0)
        
        if policy:
            # If warning threshold is 75%, it means warning triggers when 75% of time is consumed
            # i.e. 25% of time is remaining.
            due_soon_threshold_fraction = 1.0 - (policy.warning_threshold_percent / 100.0)
            # Typically at_risk is a tighter threshold. For simplicity, we make it half of due soon.
            at_risk_threshold_fraction = due_soon_threshold_fraction / 2.0

        # Less than at_risk fraction of time remaining -> AT_RISK
        if remaining_duration <= (total_duration * at_risk_threshold_fraction):
            return "AT_RISK"
        
        # Less than due_soon fraction -> DUE_SOON
        if remaining_duration <= (total_duration * due_soon_threshold_fraction):
            return "DUE_SOON"

        return "ON_TRACK"
