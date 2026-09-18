from fastapi import Request, status
from fastapi.responses import JSONResponse
import uuid
from app.domain.exceptions import (
    QEMSBusinessError, 
    ProjectAccessDeniedError, 
    TenantAccessDeniedError, 
    UnauthorizedWorkflowActionError,
    InvalidStateTransitionError,
    ConcurrentModificationError,
    WorkflowPrerequisiteFailedError
)
from fastapi.exceptions import RequestValidationError

class QEMSAPIException(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict = None
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}

async def qems_exception_handler(request: Request, exc: QEMSAPIException):
    request_id = request.state.request_id if hasattr(request.state, "request_id") else str(uuid.uuid4())
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": request_id
            }
        },
    )

async def business_error_handler(request: Request, exc: QEMSBusinessError):
    request_id = request.state.request_id if hasattr(request.state, "request_id") else str(uuid.uuid4())
    
    # Map domain errors to appropriate HTTP statuses
    status_code = status.HTTP_400_BAD_REQUEST
    if isinstance(exc, (ProjectAccessDeniedError, TenantAccessDeniedError, UnauthorizedWorkflowActionError)):
        status_code = status.HTTP_403_FORBIDDEN
    elif isinstance(exc, ConcurrentModificationError):
        status_code = status.HTTP_409_CONFLICT
        
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": request_id
            }
        },
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = request.state.request_id if hasattr(request.state, "request_id") else str(uuid.uuid4())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters.",
                "details": {"errors": exc.errors()},
                "request_id": request_id
            }
        },
    )

async def global_exception_handler(request: Request, exc: Exception):
    request_id = request.state.request_id if hasattr(request.state, "request_id") else str(uuid.uuid4())
    # In production, do not expose internal error details.
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
                "details": {},
                "request_id": request_id
            }
        },
    )
