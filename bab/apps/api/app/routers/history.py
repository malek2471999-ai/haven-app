from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.search import Search
from app.schemas.search import HistoryItem

router = APIRouter()

@router.get("", response_model=list[HistoryItem])
async def get_history(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
):
    result = await db.execute(
        select(Search)
        .where(Search.user_id == user.id)
        .order_by(desc(Search.created_at))
        .limit(limit)
        .offset(offset)
    )
    searches = result.scalars().all()
    
    return [
        HistoryItem(
            id=str(s.id),
            thumbnail_url=s.original_image_url,
            created_at=str(s.created_at),
            total_results=s.total_results,
            best_similarity=s.best_similarity,
            status=s.status,
        )
        for s in searches
    ]

@router.delete("/{search_id}")
async def delete_history_item(
    search_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Search).where(Search.id == search_id, Search.user_id == user.id)
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    
    await db.delete(search)
    await db.commit()
    return {"message": "History item deleted"}

@router.delete("")
async def clear_history(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Search).where(Search.user_id == user.id)
    )
    searches = result.scalars().all()
    for s in searches:
        await db.delete(s)
    await db.commit()
    return {"message": "History cleared"}
