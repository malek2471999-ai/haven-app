from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import structlog
import traceback


logger = structlog.get_logger()


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            logger.error(
                "Unhandled exception",
                error=str(e),
                path=request.url.path,
                method=request.method,
                traceback=traceback.format_exc()
            )
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "An unexpected error occurred. Please try again.",
                    "error_code": "INTERNAL_ERROR"
                }
            )
