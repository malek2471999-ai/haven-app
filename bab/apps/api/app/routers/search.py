from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings, ALLOWED_MIME_TYPES, MAX_FILE_SIZE
from app.models.search import Search, SearchResult
from app.models.user import User
from app.schemas.search import SearchResponse, SearchStatusResponse, SearchResultsResponse, SearchResultItem
from app.services.search_orchestrator import SearchOrchestrator
import uuid
import aiofiles
import os
from datetime import datetime

router = APIRouter()

@router.post("", response_model=SearchResponse)
async def create_search(
    consent_confirmed: bool = Form(...),
    is_private: bool = Form(False),
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not consent_confirmed:
        raise HTTPException(status_code=400, detail="Consent must be confirmed before searching")
    
    if not file.content_type or file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_MIME_TYPES)}")
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB")
    
    search = Search(
        user_id=user.id,
        status="queued",
        consent_confirmed=True,
        original_filename=file.filename,
        is_private=is_private,
    )
    db.add(search)
    await db.commit()
    await db.refresh(search)
    
    upload_dir = f"uploads/{search.id}"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{file.filename}"
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(contents)
    
    search.original_image_url = file_path
    search.status = "processing"
    await db.commit()
    
    import asyncio
    search_id_str = str(search.id)
    
    async def run_search():
        orchestrator = SearchOrchestrator()
        try:
            await orchestrator.process_search(search_id_str)
        except Exception as e:
            import structlog
            structlog.get_logger().error("Background search failed", error=str(e))
            try:
                from app.core.database import async_session_factory
                async with async_session_factory() as db2:
                    from sqlalchemy import select as sa_select
                    result = await db2.execute(sa_select(Search).where(Search.id == search_id_str))
                    s = result.scalar_one_or_none()
                    if s:
                        s.status = "failed"
                        s.error_message = str(e)
                        await db2.commit()
            except Exception:
                pass
    
    asyncio.create_task(run_search())
    
    return SearchResponse(
        search_id=str(search.id),
        status="queued",
        message="Search queued for processing"
    )

@router.get("/{search_id}/status", response_model=SearchStatusResponse)
async def get_search_status(
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
    
    return SearchStatusResponse(
        search_id=str(search.id),
        status=search.status,
        total_results=search.total_results,
        error_message=search.error_message,
        created_at=str(search.created_at),
        completed_at=str(search.completed_at) if search.completed_at else None,
    )

@router.get("/{search_id}/results", response_model=SearchResultsResponse)
async def get_search_results(
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
    
    results = await db.execute(
        select(SearchResult)
        .where(SearchResult.search_id == search_id, SearchResult.is_duplicate == False)
        .order_by(SearchResult.final_score.desc())
    )
    items = results.scalars().all()
    
    return SearchResultsResponse(
        search_id=str(search.id),
        status=search.status,
        total_results=len(items),
        results=[
            SearchResultItem(
                id=str(r.id),
                source_url=r.source_url,
                image_url=r.image_url,
                thumbnail_url=r.thumbnail_url,
                page_title=r.page_title,
                page_description=r.page_description,
                domain=r.domain,
                source_type=r.source_type,
                visual_similarity=r.visual_similarity,
                image_hash_similarity=r.image_hash_similarity,
                face_region_similarity=r.face_region_similarity,
                final_score=r.final_score,
                result_category=r.result_category,
                discovered_at=str(r.discovered_at),
            )
            for r in items
        ],
        providers_used=search.providers_used or [],
        best_similarity=search.best_similarity,
    )

@router.delete("/{search_id}")
async def delete_search(
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
    return {"message": "Search deleted"}
