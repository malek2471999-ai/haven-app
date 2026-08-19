from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.security import require_admin
from app.models.provider import ProviderLog
from app.models.search import Search

router = APIRouter()

@router.get("/errors")
async def list_error_logs(
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    from app.models.user import AuditLog, ErrorLog
    result = await db.execute(
        select(ErrorLog).order_by(desc(ErrorLog.created_at)).limit(limit).offset(offset)
    )
    logs = result.scalars().all()
    
    return [
        {
            "id": str(l.id),
            "service": l.service,
            "endpoint": l.endpoint,
            "error_code": l.error_code,
            "message": l.message,
            "request_id": l.request_id,
            "severity": l.severity,
            "created_at": str(l.created_at),
        }
        for l in logs
    ]

@router.get("/providers")
async def list_provider_logs(
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    result = await db.execute(
        select(ProviderLog).order_by(desc(ProviderLog.created_at)).limit(limit).offset(offset)
    )
    logs = result.scalars().all()
    
    return [
        {
            "id": str(l.id),
            "provider_id": str(l.provider_id) if l.provider_id else None,
            "request_url": l.request_url,
            "request_method": l.request_method,
            "response_status": l.response_status,
            "response_time_ms": l.response_time_ms,
            "error_code": l.error_code,
            "error_message": l.error_message,
            "created_at": str(l.created_at),
        }
        for l in logs
    ]
