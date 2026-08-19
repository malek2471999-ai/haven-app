"""Base search provider adapter."""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from app.models.provider import SearchProvider
from app.core.security import decrypt_value
import time

class BaseProviderAdapter(ABC):
    """Abstract base class for search provider adapters."""
    
    def __init__(self, provider: SearchProvider):
        self.provider = provider
        self.api_key = None
        self.api_secret = None
        if provider.api_key_encrypted:
            try:
                self.api_key = decrypt_value(provider.api_key_encrypted)
            except Exception:
                self.api_key = None
        if provider.api_secret_encrypted:
            try:
                self.api_secret = decrypt_value(provider.api_secret_encrypted)
            except Exception:
                self.api_secret = None
    
    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test provider connectivity."""
        pass
    
    @abstractmethod
    async def search_by_image(
        self,
        image_path: str,
        image_hash: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Search for similar images."""
        pass
    
    def _measure_latency(self, func):
        """Measure execution time."""
        start = time.time()
        result = func()
        latency = int((time.time() - start) * 1000)
        return result, latency
    
    def _normalize_result(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a raw result to standard format."""
        return {
            "source_url": raw.get("source_url", ""),
            "image_url": raw.get("image_url"),
            "thumbnail_url": raw.get("thumbnail_url"),
            "page_title": raw.get("page_title"),
            "page_description": raw.get("page_description"),
            "domain": raw.get("domain"),
            "source_type": raw.get("source_type", "other"),
            "image_hash": raw.get("image_hash"),
            "provider_confidence": raw.get("confidence", 0.5),
        }
