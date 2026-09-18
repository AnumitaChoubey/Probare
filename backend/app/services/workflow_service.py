from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone
import uuid
import hashlib
import json
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

    def _generate_hash(self, payload: dict) -> str:
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()

    async def _check_idempotency(self, session: AsyncSession, idempotency_key: str, payload_hash: str):
        from app.models.integration import IdempotencyRecord
        res = await session.execute(select(IdempotencyRecord).filter_by(idempotency_key=idempotency_key))
        record = res.scalars().first()
        if record:
            if record.request_hash != payload_hash:
                from fastapi import HTTPException
                raise HTTPException(status_code=409, detail="IDEMPOTENCY_CONFLICT: Same key with different payload")
            return record
        return None
        
    async def _save_idempotency(self, session: AsyncSession, idempotency_key: str, payload_hash: str, status: int, body: dict):
        from app.models.integration import IdempotencyRecord
        record = IdempotencyRecord(
            id=str(uuid.uuid4()),
            idempotency_key=idempotency_key,
            request_hash=payload_hash,
            response_status=status,
            response_body=body
        )
        session.add(record)
        return record

    async def submit_rebuttal(self, session: AsyncSession, event: QualityEvent, category: str, explanation: str, evidence_files: list, actor_id: str, idempotency_key: str = None) -> dict:
        payload_hash = ""
        if idempotency_key:
            payload_hash = self._generate_hash({"category": category, "explanation": explanation, "evidence_files": evidence_files})
            scoped_key = f"{event.tenant_id}:{event.project_id}:rebuttal:{idempotency_key}"
            cached = await self._check_idempotency(session, scoped_key, payload_hash)
            if cached: return cached.response_body

        if event.status != "Under Review":
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Rebuttal can only be submitted when event is Under Review")

        from app.models.quality import Rebuttal
        # Uniqueness constraint naturally enforces 1 rebuttal per event
        rebuttal = Rebuttal(
            id=str(uuid.uuid4()),
            project_id=event.project_id,
            quality_event_id=event.id,
            category=category,
            explanation=explanation,
            submitted_by_id=actor_id,
            status="Pending QA"
        )
        session.add(rebuttal)
        
        # Transition event
        await self.transition_event(session, event, "Rebuttal Pending", actor_id, event.version, "Rebuttal submitted")

        await self.audit_service.record_action(session, event.tenant_id, event.project_id, "Rebuttal", rebuttal.id, "CREATE", actor_id, new_value={"category": category})
        await self.timeline_service.record_event(session, event.id, event.project_id, event.tenant_id, "REBUTTAL_SUBMITTED", "Rebuttal submitted for review", actor_id)

        result = {"id": rebuttal.id, "status": rebuttal.status, "category": rebuttal.category}
        if idempotency_key:
            await self._save_idempotency(session, scoped_key, payload_hash, 201, result)
        
        return result

    async def submit_decision(self, session: AsyncSession, event: QualityEvent, decision: str, rationale: str, actor_id: str, expected_version: int, idempotency_key: str = None) -> dict:
        payload_hash = ""
        if idempotency_key:
            payload_hash = self._generate_hash({"decision": decision, "rationale": rationale})
            scoped_key = f"{event.tenant_id}:{event.project_id}:decision:{idempotency_key}"
            cached = await self._check_idempotency(session, scoped_key, payload_hash)
            if cached: return cached.response_body
            
        if event.status != "Rebuttal Pending":
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Decision can only be made when Rebuttal Pending")

        from app.models.quality import Decision, Rebuttal
        reb_res = await session.execute(select(Rebuttal).filter_by(quality_event_id=event.id))
        rebuttal = reb_res.scalars().first()
        if rebuttal:
            rebuttal.qa_decision = decision
            rebuttal.qa_rationale = rationale
            rebuttal.qa_assessed_by_id = actor_id
            rebuttal.status = decision

        decision_rec = Decision(
            id=str(uuid.uuid4()),
            project_id=event.project_id,
            quality_event_id=event.id,
            decision_type="Rebuttal Decision",
            outcome=decision,
            rationale=rationale,
            decided_by_id=actor_id
        )
        session.add(decision_rec)

        target_state = "Upheld"
        if decision == "Overturn": target_state = "Overturned"
        elif decision == "Partially Accept": target_state = "Partially Accepted"

        await self.transition_event(session, event, target_state, actor_id, expected_version, rationale)

        await self.audit_service.record_action(session, event.tenant_id, event.project_id, "Decision", decision_rec.id, "CREATE", actor_id, new_value={"outcome": decision})
        await self.timeline_service.record_event(session, event.id, event.project_id, event.tenant_id, "DECISION_MADE", f"QA Decision: {decision}", actor_id)

        result = {"id": decision_rec.id, "outcome": decision}
        if idempotency_key:
            await self._save_idempotency(session, scoped_key, payload_hash, 201, result)
        return result

    async def submit_rca(self, session: AsyncSession, event: QualityEvent, rca_data: dict, actor_id: str, idempotency_key: str = None) -> dict:
        payload_hash = ""
        if idempotency_key:
            payload_hash = self._generate_hash(rca_data)
            scoped_key = f"{event.tenant_id}:{event.project_id}:rca:{idempotency_key}"
            cached = await self._check_idempotency(session, scoped_key, payload_hash)
            if cached: return cached.response_body
            
        from app.models.quality import RootCause
        rca = RootCause(
            id=str(uuid.uuid4()),
            project_id=event.project_id,
            quality_event_id=event.id,
            problem_statement=rca_data.get("problem_statement"),
            five_whys=rca_data.get("five_whys"),
            fishbone=rca_data.get("fishbone"),
            primary_category=rca_data.get("primary_category"),
            contributing_factors=rca_data.get("contributing_factors"),
            confidence=rca_data.get("confidence"),
            completed_by_id=actor_id
        )
        session.add(rca)

        await self.audit_service.record_action(session, event.tenant_id, event.project_id, "RootCause", rca.id, "CREATE", actor_id, new_value={"primary_category": rca.primary_category})
        await self.timeline_service.record_event(session, event.id, event.project_id, event.tenant_id, "RCA_SUBMITTED", "Root Cause Analysis submitted", actor_id)

        result = {"id": rca.id, "primary_category": rca.primary_category}
        if idempotency_key:
            await self._save_idempotency(session, scoped_key, payload_hash, 201, result)
        return result

    async def add_capa(self, session: AsyncSession, event: QualityEvent, capa_data: dict, actor_id: str, idempotency_key: str = None) -> dict:
        payload_hash = ""
        if idempotency_key:
            payload_hash = self._generate_hash(capa_data)
            scoped_key = f"{event.tenant_id}:{event.project_id}:capa:{idempotency_key}"
            cached = await self._check_idempotency(session, scoped_key, payload_hash)
            if cached: return cached.response_body
            
        from app.models.quality import CorrectiveAction
        capa = CorrectiveAction(
            id=str(uuid.uuid4()),
            project_id=event.project_id,
            quality_event_id=event.id,
            title=capa_data.get("title"),
            description=capa_data.get("description"),
            owner_id=capa_data.get("owner"),
            priority=capa_data.get("priority"),
            due_date=datetime.fromisoformat(capa_data.get("dueDate").replace('Z', '+00:00')) if capa_data.get("dueDate") else datetime.now(timezone.utc),
            status="Not Started"
        )
        session.add(capa)

        await self.audit_service.record_action(session, event.tenant_id, event.project_id, "CorrectiveAction", capa.id, "CREATE", actor_id, new_value={"title": capa.title})
        await self.timeline_service.record_event(session, event.id, event.project_id, event.tenant_id, "CAPA_CREATED", f"CAPA created: {capa.title}", actor_id)

        result = {"id": capa.id, "title": capa.title, "status": capa.status}
        if idempotency_key:
            await self._save_idempotency(session, scoped_key, payload_hash, 201, result)
        return result
        
    async def update_capa(self, session: AsyncSession, capa: Any, update_data: dict, actor_id: str, tenant_id: str, idempotency_key: str = None) -> dict:
        payload_hash = ""
        if idempotency_key:
            payload_hash = self._generate_hash(update_data)
            scoped_key = f"{tenant_id}:{capa.project_id}:capa_update:{idempotency_key}"
            cached = await self._check_idempotency(session, scoped_key, payload_hash)
            if cached: return cached.response_body

        old_status = capa.status
        capa.status = update_data.get("status", capa.status)
        capa.completion_notes = update_data.get("notes", capa.completion_notes)
        if capa.status == "Completed" and old_status != "Completed":
            capa.completed_at = datetime.now(timezone.utc)

        await self.audit_service.record_action(session, tenant_id, capa.project_id, "CorrectiveAction", capa.id, "UPDATE", actor_id, new_value={"status": capa.status})
        await self.timeline_service.record_event(session, capa.quality_event_id, capa.project_id, tenant_id, "CAPA_UPDATED", f"CAPA updated to {capa.status}", actor_id)

        result = {"id": capa.id, "status": capa.status}
        if idempotency_key:
            await self._save_idempotency(session, scoped_key, payload_hash, 200, result)
        return result

    async def submit_effectiveness(self, session: AsyncSession, event: QualityEvent, eff_data: dict, actor_id: str, idempotency_key: str = None) -> dict:
        payload_hash = ""
        if idempotency_key:
            payload_hash = self._generate_hash(eff_data)
            scoped_key = f"{event.tenant_id}:{event.project_id}:eff:{idempotency_key}"
            cached = await self._check_idempotency(session, scoped_key, payload_hash)
            if cached: return cached.response_body

        from app.models.quality import EffectivenessReview
        review = EffectivenessReview(
            id=str(uuid.uuid4()),
            project_id=event.project_id,
            quality_event_id=event.id,
            reviewed_by_id=actor_id,
            error_rate_before=eff_data.get("errorRateBefore"),
            error_rate_after=eff_data.get("errorRateAfter"),
            recurrence_rate=eff_data.get("recurrenceRate"),
            comparison_period=eff_data.get("comparisonPeriod"),
            decision=eff_data.get("decision"),
            rationale=eff_data.get("rationale")
        )
        session.add(review)

        # Transition event state appropriately
        decision = eff_data.get("decision")
        target_state = "Closed"
        if decision == "Not Effective": target_state = "Root Cause Analysis"

        await self.transition_event(session, event, target_state, actor_id, event.version, f"Effectiveness: {decision}")

        await self.audit_service.record_action(session, event.tenant_id, event.project_id, "EffectivenessReview", review.id, "CREATE", actor_id, new_value={"decision": review.decision})
        await self.timeline_service.record_event(session, event.id, event.project_id, event.tenant_id, "EFFECTIVENESS_REVIEW_SUBMITTED", f"Effectiveness Review submitted: {decision}", actor_id)

        result = {"id": review.id, "decision": review.decision}
        if idempotency_key:
            await self._save_idempotency(session, scoped_key, payload_hash, 201, result)
        return result
