from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.search import SearchResult
from app.schemas.collection import SavedResultCreate, SavedResultResponse
import uuid

router = APIRouter()

@router.post("", response_model=SavedResultResponse)
async def save_result(
    req: SavedResultCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    saved = SearchResult(id=uuid.uuid4(), search_id=req.search_id, provider_id=None, source_url="")
    from app.models.saved import SavedResult
    saved_item = SavedResult(
        user_id=user.id,
        search_id=req.search_id,
        result_id=req.result_id,
        collection_id=req.collection_id,
        notes=req.notes,
    )
    db.add(saved_item)
    await db.commit()
    await db.refresh(saved_item)
    
    return SavedResultResponse(
        id=str(saved_item.id),
        search_id=str(saved_item.search_id) if saved_item.search_id else None,
        result_id=str(saved_item.result_id) if saved_item.result_id else None,
        collection_id=str(saved_item.collection_id) if saved_item.collection_id else None,
        notes=saved_item.notes,
        created_at=str(saved_item.created_at),
    )

@router.delete("/{saved_id}")
async def remove_saved(
    saved_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.saved import SavedResult
    result = await db.execute(
        select(SavedResult).where(SavedResult.id == saved_id, SavedResult.user_id == user.id)
    )
    saved = result.scalar_one_or_none()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved result not found")
    
    await db.delete(saved)
    await db.commit()
    return {"message": "Result removed from saved"}
