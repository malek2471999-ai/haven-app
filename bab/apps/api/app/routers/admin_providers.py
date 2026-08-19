from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import require_admin, encrypt_value, decrypt_value
from app.models.provider import SearchProvider, ProviderLog
from app.schemas.provider import ProviderCreate, ProviderUpdate, ProviderResponse, ProviderTestResponse
from app.services.search_providers import get_provider_adapter
import uuid

router = APIRouter()

@router.get("", response_model=list[ProviderResponse])
async def list_providers(
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SearchProvider).order_by(SearchProvider.priority.desc()))
    providers = result.scalars().all()
    
    return [
        ProviderResponse(
            id=str(p.id),
            name=p.name,
            slug=p.slug,
            api_base_url=p.api_base_url,
            is_enabled=p.is_enabled,
            health_status=p.health_status,
            requests_today=p.requests_today,
            daily_quota=p.daily_quota,
            avg_latency_ms=p.avg_latency_ms,
            supports_visual_search=p.supports_visual_search,
            supports_face_search=p.supports_face_search,
            supports_web_search=p.supports_web_search,
            created_at=str(p.created_at),
        )
        for p in providers
    ]

@router.post("", response_model=ProviderResponse)
async def create_provider(
    req: ProviderCreate,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(SearchProvider).where(SearchProvider.slug == req.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Provider with this slug already exists")
    
    provider = SearchProvider(
        name=req.name,
        slug=req.slug,
        api_base_url=req.api_base_url,
        api_key_encrypted=encrypt_value(req.api_key) if req.api_key else None,
        api_secret_encrypted=encrypt_value(req.api_secret) if req.api_secret else None,
        daily_quota=req.daily_quota,
        timeout_ms=req.timeout_ms,
        is_enabled=req.is_enabled,
        supports_visual_search=req.supports_visual_search,
        supports_face_search=req.supports_face_search,
        supports_web_search=req.supports_web_search,
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    
    return ProviderResponse(
        id=str(provider.id),
        name=provider.name,
        slug=provider.slug,
        api_base_url=provider.api_base_url,
        is_enabled=provider.is_enabled,
        health_status=provider.health_status,
        requests_today=provider.requests_today,
        daily_quota=provider.daily_quota,
        avg_latency_ms=provider.avg_latency_ms,
        supports_visual_search=provider.supports_visual_search,
        supports_face_search=provider.supports_face_search,
        supports_web_search=provider.supports_web_search,
        created_at=str(provider.created_at),
    )

@router.patch("/{provider_id}", response_model=ProviderResponse)
async def update_provider(
    provider_id: str,
    req: ProviderUpdate,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SearchProvider).where(SearchProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    update_data = req.model_dump(exclude_unset=True)
    if "api_key" in update_data and update_data["api_key"]:
        provider.api_key_encrypted = encrypt_value(update_data.pop("api_key"))
    if "api_secret" in update_data and update_data["api_secret"]:
        provider.api_secret_encrypted = encrypt_value(update_data.pop("api_secret"))
    
    for key, value in update_data.items():
        setattr(provider, key, value)
    
    await db.commit()
    await db.refresh(provider)
    
    return ProviderResponse(
        id=str(provider.id),
        name=provider.name,
        slug=provider.slug,
        api_base_url=provider.api_base_url,
        is_enabled=provider.is_enabled,
        health_status=provider.health_status,
        requests_today=provider.requests_today,
        daily_quota=provider.daily_quota,
        avg_latency_ms=provider.avg_latency_ms,
        supports_visual_search=provider.supports_visual_search,
        supports_face_search=provider.supports_face_search,
        supports_web_search=provider.supports_web_search,
        created_at=str(provider.created_at),
    )

@router.post("/{provider_id}/test", response_model=ProviderTestResponse)
async def test_provider(
    provider_id: str,
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SearchProvider).where(SearchProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    adapter = get_provider_adapter(provider)
    status_result = await adapter.test_connection()
    
    return ProviderTestResponse(
        status=status_result["status"],
        message=status_result.get("message", ""),
        latency_ms=status_result.get("latency_ms"),
    )
