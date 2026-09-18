class QEMSBusinessError(Exception):
    """Base exception for all business domain errors."""
    def __init__(self, message: str, code: str, **kwargs):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = kwargs

class InvalidStateTransitionError(QEMSBusinessError):
    def __init__(self, current_state: str, target_state: str, allowed_transitions: list[str], request_id: str = None):
        super().__init__(
            message=f"Cannot transition from {current_state} to {target_state}",
            code="INVALID_STATE_TRANSITION",
            current_state=current_state,
            target_state=target_state,
            allowed_transitions=allowed_transitions,
            request_id=request_id
        )

class ConcurrentModificationError(QEMSBusinessError):
    def __init__(self, entity_id: str, entity_type: str, expected_version: int, actual_version: int):
        super().__init__(
            message=f"Concurrent modification detected on {entity_type} {entity_id}",
            code="CONCURRENT_MODIFICATION",
            entity_id=entity_id,
            entity_type=entity_type,
            expected_version=expected_version,
            actual_version=actual_version
        )

class WorkflowPrerequisiteFailedError(QEMSBusinessError):
    def __init__(self, reason: str, entity_id: str, missing_prerequisites: list[str] = None):
        super().__init__(
            message=f"Workflow prerequisite failed: {reason}",
            code="WORKFLOW_PREREQUISITE_FAILED",
            entity_id=entity_id,
            reason=reason,
            missing_prerequisites=missing_prerequisites or []
        )

class UnauthorizedWorkflowActionError(QEMSBusinessError):
    def __init__(self, actor_id: str, action: str, reason: str):
        super().__init__(
            message=f"Unauthorized workflow action: {reason}",
            code="UNAUTHORIZED_WORKFLOW_ACTION",
            actor_id=actor_id,
            action=action,
            reason=reason
        )

class SLAPolicyNotFoundError(QEMSBusinessError):
    def __init__(self, policy_type: str, project_id: str = None):
        super().__init__(
            message=f"SLA Policy not found for type: {policy_type}",
            code="SLA_POLICY_NOT_FOUND",
            policy_type=policy_type,
            project_id=project_id
        )

class ProjectAccessDeniedError(QEMSBusinessError):
    def __init__(self, user_id: str, project_id: str):
        super().__init__(
            message=f"Access denied to project {project_id}",
            code="PROJECT_ACCESS_DENIED",
            user_id=user_id,
            project_id=project_id
        )

class TenantAccessDeniedError(QEMSBusinessError):
    def __init__(self, user_id: str, tenant_id: str):
        super().__init__(
            message=f"Access denied to tenant {tenant_id}",
            code="TENANT_ACCESS_DENIED",
            user_id=user_id,
            tenant_id=tenant_id
        )

class IdempotencyConflictError(QEMSBusinessError):
    def __init__(self, idempotency_key: str, status: str):
        super().__init__(
            message=f"Idempotency conflict for key {idempotency_key} (Status: {status})",
            code="IDEMPOTENCY_CONFLICT",
            idempotency_key=idempotency_key,
            status=status
        )
