from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import structlog
import uuid

from app.core.config import settings
from app.core.database import async_engine as engine, init_db
from app.routers import search, history, saved, collections, auth as auth_router
from app.routers import admin_providers, admin_searches, admin_logs, admin_health
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.error_handler import ErrorHandlerMiddleware

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting BAB API", version="0.1.0")
    await init_db()
    yield
    logger.info("Shutting down BAB API")

app = FastAPI(
    title="BAB API",
    description="Reverse Image & Visual Similarity Search API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(ErrorHandlerMiddleware)

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    structlog.contextvars.bind_contextvars(request_id=request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(saved.router, prefix="/api/saved", tags=["saved"])
app.include_router(collections.router, prefix="/api/collections", tags=["collections"])
app.include_router(admin_providers.router, prefix="/api/admin/providers", tags=["admin-providers"])
app.include_router(admin_searches.router, prefix="/api/admin/searches", tags=["admin-searches"])
app.include_router(admin_logs.router, prefix="/api/admin/logs", tags=["admin-logs"])
app.include_router(admin_health.router, prefix="/api/admin/system-health", tags=["admin-health"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "bab-api", "version": "0.1.0"}
