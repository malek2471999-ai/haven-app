from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import time
from collections import defaultdict


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/") and not request.url.path.startswith("/api/health"):
            client_ip = request.client.host if request.client else "unknown"
            now = time.time()

            key = f"ip:{client_ip}"
            self.requests[key] = [t for t in self.requests[key] if now - t < 60]

            if len(self.requests[key]) > 100:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={"Retry-After": "60"}
                )

            self.requests[key].append(now)

        response = await call_next(request)
        return response
