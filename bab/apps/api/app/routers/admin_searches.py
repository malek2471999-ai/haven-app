from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.security import require_admin
from app.models.search import Search

router = APIRouter()

@router.get("")
async def list_searches(
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    result = await db.execute(
        select(Search).order_by(desc(Search.created_at)).limit(limit).offset(offset)
    )
    searches = result.scalars().all()
    
    return [
        {
            "id": str(s.id),
            "user_id": str(s.user_id) if s.user_id else None,
            "status": s.status,
            "providers_used": s.providers_used or [],
            "total_results": s.total_results,
            "search_duration_ms": s.search_duration_ms,
            "created_at": str(s.created_at),
            "completed_at": str(s.completed_at) if s.completed_at else None,
        }
        for s in searches
    ]
