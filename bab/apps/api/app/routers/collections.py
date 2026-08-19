from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.saved import Collection, SavedResult
from app.schemas.collection import CollectionCreate, CollectionUpdate, CollectionResponse

router = APIRouter()

@router.get("", response_model=list[CollectionResponse])
async def list_collections(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Collection)
        .where(Collection.user_id == user.id)
        .order_by(desc(Collection.updated_at))
    )
    collections = result.scalars().all()
    
    return [
        CollectionResponse(
            id=str(c.id),
            name=c.name,
            description=c.description,
            icon=c.icon,
            result_count=c.result_count,
            created_at=str(c.created_at),
            updated_at=str(c.updated_at),
        )
        for c in collections
    ]

@router.post("", response_model=CollectionResponse)
async def create_collection(
    req: CollectionCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    collection = Collection(
        user_id=user.id,
        name=req.name,
        description=req.description,
        icon=req.icon,
    )
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    
    return CollectionResponse(
        id=str(collection.id),
        name=collection.name,
        description=collection.description,
        icon=collection.icon,
        result_count=collection.result_count,
        created_at=str(collection.created_at),
        updated_at=str(collection.updated_at),
    )

@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: str,
    req: CollectionUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id)
    )
    collection = result.scalar_one_or_none()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    if req.name is not None:
        collection.name = req.name
    if req.description is not None:
        collection.description = req.description
    if req.icon is not None:
        collection.icon = req.icon
    
    await db.commit()
    await db.refresh(collection)
    
    return CollectionResponse(
        id=str(collection.id),
        name=collection.name,
        description=collection.description,
        icon=collection.icon,
        result_count=collection.result_count,
        created_at=str(collection.created_at),
        updated_at=str(collection.updated_at),
    )

@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id)
    )
    collection = result.scalar_one_or_none()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    await db.delete(collection)
    await db.commit()
    return {"message": "Collection deleted"}
