from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, Optional
from datetime import datetime, timezone
import uuid

from app.models.quality import QualityEvent
from app.repositories.quality_event_repository import QualityEventRepository
from app.domain.exceptions import ConcurrentModificationError
from app.services.sla_service import SLAService

from app.schemas.auth import AuthContext
from app.api.deps.auth import authorize_quality_event_access

class QualityEventService:
    def __init__(self):
        self.repository = QualityEventRepository()

    async def get_event(
        self, 
        session: AsyncSession, 
        event_id: str, 
        tenant_id: str = None, 
        project_id: str = None,
        auth_context: AuthContext = None
    ) -> Optional[QualityEvent]:
        # Enforce Data Scope at the SQL level
        if auth_context:
            event = await self.repository.get_with_scopes(session, id=event_id, user_id=auth_context.qems_user_id, tenant_id=tenant_id, project_id=project_id)
        else:
            event = await self.repository.get_with_relations(session, id=event_id, tenant_id=tenant_id, project_id=project_id)
            
        if event and auth_context:
            authorize_quality_event_access(event, auth_context)
        return event

    async def list_events(
        self,
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        filters: Dict[str, Any] = None,
        skip: int = 0,
        limit: int = 50,
        auth_context: AuthContext = None
    ) -> tuple[list[QualityEvent], int]:
        from sqlalchemy.future import select
        from sqlalchemy import or_, func
        
        # Start base query
        stmt = select(QualityEvent).filter_by(tenant_id=tenant_id, project_id=project_id)
        
        user_id = filters.pop("user_id", None) if filters else None
        
        # Mandatory Data Scope Rule Enforcement
        if auth_context:
            stmt = await self.repository._apply_data_scope(session, stmt, auth_context.qems_user_id)
        
        if filters:
            if filters.pop("assigned_to_me", None) and user_id:
                stmt = stmt.filter(QualityEvent.owner_id == user_id)
            if filters.pop("created_by_me", None) and user_id:
                stmt = stmt.filter(QualityEvent.created_by_id == user_id)
            if filters.pop("involving_me", None) and user_id:
                stmt = stmt.filter(
                    or_(
                        QualityEvent.owner_id == user_id,
                        QualityEvent.employee_id == user_id,
                        QualityEvent.created_by_id == user_id
                    )
                )
            if filters.pop("awaiting_my_review", None) and user_id:
                stmt = stmt.filter(
                    QualityEvent.status.in_(["QA Review", "Manager Review"])
                )
                
            # Generic remaining filters
            for k, v in filters.items():
                if hasattr(QualityEvent, k):
                    stmt = stmt.filter(getattr(QualityEvent, k) == v)
                    
        # Get total count before pagination
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await session.execute(count_stmt)
        total_count = total_result.scalar() or 0
                    
        stmt = stmt.order_by(QualityEvent.created_at.desc())
        stmt = stmt.offset(skip).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all()), total_count

    def create_event(
        self,
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        title: str,
        description: str,
        employee_id: str,
        team_id: str,
        process_id: str,
        sub_process_id: str,
        error_type_id: str,
        sop_id: str,
        severity: str,
        owner_id: str,
        created_by_id: str,
        customer_impact: str,
        status: str = "Draft"
    ) -> QualityEvent:
        """Create a new QualityEvent. No SLA calculation until Logged state."""
        event_number = f"QE-{uuid.uuid4().hex[:8].upper()}"
        
        event = self.repository.create_obj(
            tenant_id=tenant_id,
            project_id=project_id,
            event_number=event_number,
            title=title,
            description=description,
            employee_id=employee_id,
            team_id=team_id,
            process_id=process_id,
            sub_process_id=sub_process_id,
            error_type_id=error_type_id,
            sop_id=sop_id,
            severity=severity,
            owner_id=owner_id,
            created_by_id=created_by_id,
            customer_impact=customer_impact,
            status=status,
            version=1
        )
        session.add(event)
        return event

    def update_event(
        self,
        session: AsyncSession,
        event: QualityEvent,
        expected_version: int,
        updates: Dict[str, Any]
    ) -> QualityEvent:
        """
        Update QualityEvent using Optimistic Concurrency Control.
        Must provide the expected version.
        """
        if event.version != expected_version:
            raise ConcurrentModificationError(
                entity_id=event.id,
                entity_type="QualityEvent",
                expected_version=expected_version,
                actual_version=event.version
            )

        # Apply updates
        for key, value in updates.items():
            if hasattr(event, key):
                setattr(event, key, value)
        
        # Bump version
        event.version += 1
        return event
