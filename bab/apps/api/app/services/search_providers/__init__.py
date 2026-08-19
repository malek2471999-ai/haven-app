"""Search provider adapters."""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.provider import SearchProvider
from app.core.security import decrypt_value
import structlog

logger = structlog.get_logger()

async def get_active_providers(db: AsyncSession) -> List[SearchProvider]:
    """Get all enabled and healthy providers."""
    result = await db.execute(
        select(SearchProvider)
        .where(SearchProvider.is_enabled == True)
        .order_by(SearchProvider.priority.desc())
    )
    return result.scalars().all()

def get_provider_adapter(provider: SearchProvider):
    """Get the appropriate adapter for a provider."""
    from app.services.search_providers.base import BaseProviderAdapter
    from app.services.search_providers.generic import GenericProviderAdapter
    
    slug = provider.slug.lower()
    if "saucenao" in slug:
        from app.services.search_providers.saucenao import SaucenaoProviderAdapter
        return SaucenaoProviderAdapter(provider)
    elif "web-search" in slug or "websearch" in slug:
        from app.services.search_providers.web_search import WebSearchProviderAdapter
        return WebSearchProviderAdapter(provider)
    elif "google" in slug:
        from app.services.search_providers.google import GoogleProviderAdapter
        return GoogleProviderAdapter(provider)
    elif "yandex" in slug:
        from app.services.search_providers.yandex import YandexProviderAdapter
        return YandexProviderAdapter(provider)
    elif "bing" in slug:
        from app.services.search_providers.bing import BingProviderAdapter
        return BingProviderAdapter(provider)
    
    return GenericProviderAdapter(provider)

async def search_with_provider(
    provider: SearchProvider,
    image_path: str,
    image_hash: Optional[str] = None,
) -> list:
    """Search using a specific provider."""
    adapter = get_provider_adapter(provider)
    try:
        results = await adapter.search_by_image(image_path, image_hash)
        return results
    except Exception as e:
        logger.error("Provider search failed", provider=provider.name, error=str(e))
        raise
