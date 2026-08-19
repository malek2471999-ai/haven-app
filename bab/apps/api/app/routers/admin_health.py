from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import require_admin
from app.models.search import Search
from app.models.provider import SearchProvider
from datetime import datetime, timedelta

router = APIRouter()

@router.get("")
async def system_health(
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.utcnow().date()
    month_start = datetime.utcnow().replace(day=1)
    
    searches_today = await db.execute(
        select(func.count(Search.id)).where(
            func.date(Search.created_at) == today
        )
    )
    searches_month = await db.execute(
        select(func.count(Search.id)).where(
            Search.created_at >= month_start
        )
    )
    successful = await db.execute(
        select(func.count(Search.id)).where(Search.status == "completed")
    )
    failed = await db.execute(
        select(func.count(Search.id)).where(Search.status == "failed")
    )
    providers = await db.execute(select(SearchProvider))
    provider_list = providers.scalars().all()
    active_providers = [p for p in provider_list if p.is_enabled and p.health_status == "connected"]
    
    return {
        "searches_today": searches_today.scalar() or 0,
        "searches_this_month": searches_month.scalar() or 0,
        "successful_searches": successful.scalar() or 0,
        "failed_searches": failed.scalar() or 0,
        "active_providers": len(active_providers),
        "total_providers": len(provider_list),
        "api_server": "operational",
        "database": "operational",
        "storage": "operational",
        "similarity_engine": "operational",
    }
