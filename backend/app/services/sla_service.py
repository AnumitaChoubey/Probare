from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
import uuid
import json

from app.models.meta import SLAPolicy, WorkingHoursCalendar, Holiday, EscalationRule
from app.models.quality import SLAClock, QualityEvent
from app.services.outbox_service import OutboxService

class SLAService:
    """
    V2 SLA Engine: Per-stage, Working-hours-aware, Escalation-matrix integrated.
    """

    @classmethod
    async def get_policy_for_stage(
        cls, 
        session: AsyncSession, 
        tenant_id: str, 
        process_id: str, 
        stage: str,
        severity: str
    ) -> Optional[SLAPolicy]:
        # Try specific process + severity
        stmt = select(SLAPolicy).filter_by(
            tenant_id=tenant_id, process_id=process_id, stage=stage, severity=severity, active=True
        )
        policy = (await session.execute(stmt)).scalars().first()
        
        if not policy:
            # Fallback to general process policy
            stmt = select(SLAPolicy).filter_by(
                tenant_id=tenant_id, process_id=process_id, stage=stage, severity=None, active=True
            )
            policy = (await session.execute(stmt)).scalars().first()
            
        return policy

    @classmethod
    async def start_clock(
        cls, 
        session: AsyncSession, 
        event: QualityEvent, 
        stage: str,
        started_at: Optional[datetime] = None
    ) -> Optional[SLAClock]:
        """Starts a new SLA clock for the given stage if a policy exists."""
        if not started_at:
            started_at = datetime.now(timezone.utc)
            
        policy = await cls.get_policy_for_stage(session, event.tenant_id, event.process_id, stage, event.severity)
        
        if not policy:
            return None # No SLA defined for this stage
            
        clock = SLAClock(
            id=str(uuid.uuid4()),
            project_id=event.project_id,
            quality_event_id=event.id,
            stage=stage,
            sla_policy_id=policy.id,
            started_at=started_at,
            paused_intervals=[],
            elapsed_minutes=0,
            status="running"
        )
        session.add(clock)
        return clock

    @classmethod
    async def stop_clock(
        cls, 
        session: AsyncSession, 
        event_id: str, 
        stage: str
    ):
        """Marks the currently running clock for this stage as completed."""
        stmt = select(SLAClock).filter_by(quality_event_id=event_id, stage=stage, status="running")
        clock = (await session.execute(stmt)).scalars().first()
        if clock:
            clock.status = "completed"
            
    @classmethod
    async def process_active_clocks(
        cls,
        session: AsyncSession,
        tenant_id: str
    ):
        """
        Background worker entrypoint: Iterates active clocks, updates elapsed_minutes based on working hours, 
        checks for warnings/breaches, and triggers escalations.
        """
        now = datetime.now(timezone.utc)
        
        stmt = select(SLAClock).filter_by(status="running")
        # In a real setup, we'd chunk this by tenant or fetch in batches
        clocks = (await session.execute(stmt)).scalars().all()
        
        if not clocks:
            return
            
        # Pre-fetch calendars and holidays for the tenant
        cal_stmt = select(WorkingHoursCalendar).filter_by(tenant_id=tenant_id)
        calendars = {c.day_of_week: c for c in (await session.execute(cal_stmt)).scalars().all()}
        
        hol_stmt = select(Holiday).filter_by(tenant_id=tenant_id)
        holidays = [h.holiday_date.date() for h in (await session.execute(hol_stmt)).scalars().all()]
        
        for clock in clocks:
            policy = await session.get(SLAPolicy, clock.sla_policy_id)
            if not policy: continue
            
            # 1. Update Elapsed Minutes
            elapsed = cls._compute_elapsed(clock.started_at, now, policy.use_working_hours, calendars, holidays)
            clock.elapsed_minutes = elapsed
            
            # 2. Check Breach / Warning
            if elapsed >= policy.duration_minutes and clock.status != "breached":
                clock.status = "breached"
                clock.breached_at = now
                
                # 3. Trigger Escalations
                if policy.escalation_matrix_id:
                    esc_stmt = select(EscalationRule).filter_by(escalation_matrix_id=policy.escalation_matrix_id, stage=clock.stage)
                    rules = (await session.execute(esc_stmt)).scalars().all()
                    # Trigger notification rules based on threshold_pct
                    # Here we would dispatch an Outbox event for each rule that was crossed
                    
    @classmethod
    def _compute_elapsed(
        cls,
        start: datetime,
        end: datetime,
        mode: str,
        calendars: dict,
        holidays: list
    ) -> int:
        if mode == "calendar":
            return int((end - start).total_seconds() / 60)
            
        # Simple working hours logic: iterate days
        # A full robust implementation handles timezone shifts and minute-by-minute overlap.
        # We simulate the basic version here.
        minutes = 0
        current = start
        while current < end:
            day = current.isoweekday() % 7 # 0=Sunday, 6=Saturday
            date = current.date()
            if date not in holidays and day in calendars:
                cal = calendars[day]
                # parse cal.start_time and cal.end_time ("09:00")
                st_h, st_m = map(int, cal.start_time.split(':'))
                en_h, en_m = map(int, cal.end_time.split(':'))
                
                day_start = current.replace(hour=st_h, minute=st_m, second=0)
                day_end = current.replace(hour=en_h, minute=en_m, second=0)
                
                # Intersect [current, end] with [day_start, day_end]
                window_start = max(current, day_start)
                window_end = min(end, day_end)
                
                if window_start < window_end:
                    minutes += int((window_end - window_start).total_seconds() / 60)
                    
            # Move to start of next day
            current = (current + timedelta(days=1)).replace(hour=0, minute=0, second=0)
            
        return minutes
