import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import time
from app.core.logging import logger

class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        correlation_id = request.headers.get("X-Correlation-ID", request_id)
        
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id
        
        start_time = time.time()
        
        # Log request start
        # logger.info(f"Incoming request {request.method} {request.url.path}", extra={"request_id": request_id})
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        
        response.headers["X-Request-ID"] = request_id
        
        # logger.info(
        #     f"Request completed",
        #     extra={
        #         "request_id": request_id,
        #         "correlation_id": correlation_id,
        #         "method": request.method,
        #         "route": request.url.path,
        #         "status": response.status_code,
        #         "duration": f"{duration:.4f}s"
        #     }
        # )
        
        return response
