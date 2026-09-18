from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone
import uuid
from typing import Any, Dict

from app.models.quality import QualityEvent
from app.domain.exceptions import (
    InvalidStateTransitionError,
    WorkflowPrerequisiteFailedError,
    UnauthorizedWorkflowActionError
)
from app.services.quality_event_service import QualityEventService
from app.services.audit_service import AuditService
from app.services.timeline_service import TimelineService
from app.services.outbox_service import OutboxService
from app.services.sla_service import SLAService

class WorkflowService:
    # State transition map
    VALID_TRANSITIONS = {
        "Draft": ["Logged"],
        "Logged": ["Under Review"],
        "Under Review": ["Rebuttal Pending", "Upheld", "Escalated"],
        "Rebuttal Pending": ["QA Review"],
        "QA Review": ["Upheld", "Overturned", "Partially Accepted"],
        "Partially Accepted": ["Corrective Action"],
        "Upheld": ["Root Cause Analysis"],
        "Root Cause Analysis": ["Corrective Action"],
        "Corrective Action": ["Effectiveness Review"],
        "Effectiveness Review": ["Closed", "Reopened", "Root Cause Analysis"],
        "Reopened": ["Root Cause Analysis", "Corrective Action"],
        "Escalated": ["Under Review", "QA Review", "Upheld", "Closed"], # Based on resolution
        "Overturned": ["Closed"],
    }

    def __init__(
        self,
        event_service: QualityEventService,
        audit_service: AuditService,
        timeline_service: TimelineService,
        outbox_service: OutboxService
    ):
        self.event_service = event_service
        self.audit_service = audit_service
        self.timeline_service = timeline_service
        self.outbox_service = outbox_service

    async def transition_event(
        self,
        session: AsyncSession,
        event: QualityEvent,
        target_state: str,
        actor_id: str,
        expected_version: int,
        reason: str = None
    ) -> QualityEvent:
        """
        Transitions a Quality Event to a new state atomically, recording audit, timeline, and outbox events.
        """
        current_state = event.status
        allowed_states = self.VALID_TRANSITIONS.get(current_state, [])

        if target_state not in allowed_states:
            raise InvalidStateTransitionError(
                current_state=current_state,
                target_state=target_state,
                allowed_transitions=allowed_states
            )

        # Basic role/prerequisite enforcement
        if target_state == "QA Review":
            if actor_id in [event.employee_id, event.created_by_id]:
                raise UnauthorizedWorkflowActionError(
                    actor_id=actor_id,
                    action="QA Review",
                    reason="Creator or Employee cannot perform QA Review"
                )
                
        if target_state == "Effectiveness Review":
            if actor_id in [event.employee_id, event.created_by_id]:
                raise UnauthorizedWorkflowActionError(
                    actor_id=actor_id,
                    action="Effectiveness Review",
                    reason="Creator or Employee cannot perform Effectiveness Review"
                )

        if target_state == "Logged" and current_state == "Draft":
            # Enforce required fields
            missing_fields = []
            if not event.process_id: missing_fields.append("process_id")
            if not event.sub_process_id: missing_fields.append("sub_process_id")
            if not event.error_type_id: missing_fields.append("error_type_id")
            if not event.sop_id: missing_fields.append("sop_id")
            if not getattr(event, "description", None) or not event.description.strip(): missing_fields.append("description")
            if not getattr(event, "customer_impact", None) or not event.customer_impact.strip(): missing_fields.append("customer_impact")
            
            if missing_fields:
                raise WorkflowPrerequisiteFailedError(
                    entity_id=event.id,
                    reason=f"Missing required fields for state Logged: {', '.join(missing_fields)}"
                )

        if current_state == "Root Cause Analysis" and target_state == "Corrective Action":
            from app.models.quality import RootCause
            rca_res = await session.execute(select(RootCause).filter_by(quality_event_id=event.id))
            rca = rca_res.scalars().first()
            if not rca:
                raise WorkflowPrerequisiteFailedError(
                    entity_id=event.id,
                    reason="Root Cause Analysis must be completed before Corrective Action."
                )

        if target_state == "Effectiveness Review" and current_state == "Corrective Action":
            from app.models.quality import CorrectiveAction
            capa_res = await session.execute(select(CorrectiveAction).filter_by(quality_event_id=event.id))
            capas = capa_res.scalars().all()
            if not capas:
                raise WorkflowPrerequisiteFailedError(
                    entity_id=event.id,
                    reason="At least one Corrective Action must exist before Effectiveness Review."
                )
            if any(capa.status != "Completed" for capa in capas):
                raise WorkflowPrerequisiteFailedError(
                    entity_id=event.id,
                    reason="All linked Corrective Actions must be Completed before Effectiveness Review."
                )

        if target_state == "Logged" and current_state == "Draft":
            # Start SLA
            due_at, is_fallback = await SLAService.calculate_due_date(
                session=session,
                created_at=datetime.now(timezone.utc),
                tenant_id=event.tenant_id,
                process_id=event.process_id,
                severity=event.severity
            )
            self.event_service.update_event(
                session, event, expected_version, {"status": target_state, "sla_due_at": due_at}
            )
        elif target_state == "Closed":
            self.event_service.update_event(
                session, event, expected_version, {"status": target_state, "closed_at": datetime.now(timezone.utc)}
            )
        else:
            self.event_service.update_event(
                session, event, expected_version, {"status": target_state}
            )

        # Audit
        await self.audit_service.record_action(
            session=session,
            entity_type="QualityEvent",
            entity_id=event.id,
            action="STATUS_CHANGED",
            actor_id=actor_id,
            tenant_id=event.tenant_id,
            project_id=event.project_id,
            old_value={"status": current_state},
            new_value={"status": target_state},
            reason=reason
        )

        # Timeline
        await self.timeline_service.record_event(
            session=session,
            quality_event_id=event.id,
            event_type="STATUS_CHANGED",
            description=f"Status changed from {current_state} to {target_state}",
            actor_id=actor_id,
            tenant_id=event.tenant_id,
            project_id=event.project_id,
            metadata_payload={"old_status": current_state, "new_status": target_state}
        )

        # Outbox (Notify subscribers)
        await self.outbox_service.dispatch(
            session=session,
            event_type="QualityEventStatusChanged",
            aggregate_type="QualityEvent",
            aggregate_id=event.id,
            tenant_id=event.tenant_id,
            project_id=event.project_id,
            payload={
                "event_number": event.event_number,
                "old_status": current_state,
                "new_status": target_state,
                "actor_id": actor_id
            },
            idempotency_key=f"transition-{event.id}-{expected_version}-{target_state}"
        )

        return event
