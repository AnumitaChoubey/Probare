from fastapi import Request

class RateLimiter:
    """
    Mock RateLimiter for Phase 3 API tests.
    In a real implementation, this wraps fastapi-limiter or a custom Redis bucket.
    """
    def __init__(self, times: int, seconds: int):
        self.times = times
        self.seconds = seconds
        
    async def __call__(self, request: Request):
        pass
