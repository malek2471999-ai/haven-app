"""Generic HTTP search provider adapter."""
from typing import Dict, Any, List, Optional
import httpx
import structlog
from app.services.search_providers.base import BaseProviderAdapter
from app.core.config import settings

logger = structlog.get_logger()

class GenericProviderAdapter(BaseProviderAdapter):
    """Generic adapter for HTTP-based search providers."""
    
    async def test_connection(self) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "status": "invalid_credentials",
                "message": "API key not configured. Search provider not configured.",
            }
        
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self.provider.api_base_url}/health",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                
                if response.status_code == 200:
                    return {
                        "status": "connected",
                        "message": "Provider connected successfully",
                        "latency_ms": int(response.elapsed.total_seconds() * 1000),
                    }
                elif response.status_code == 429:
                    return {
                        "status": "rate_limited",
                        "message": "Rate limit reached",
                    }
                elif response.status_code == 401:
                    return {
                        "status": "invalid_credentials",
                        "message": "Invalid API credentials",
                    }
                else:
                    return {
                        "status": "degraded",
                        "message": f"Unexpected status: {response.status_code}",
                    }
        except httpx.TimeoutException:
            return {
                "status": "offline",
                "message": "Connection timed out",
            }
        except Exception as e:
            return {
                "status": "offline",
                "message": f"Connection failed: {str(e)}",
            }
    
    async def search_by_image(
        self,
        image_path: str,
        image_hash: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if not self.api_key:
            logger.info("Provider not configured", provider=self.provider.name)
            return []
        
        try:
            import aiofiles
            async with aiofiles.open(image_path, 'rb') as f:
                image_data = await f.read()
            
            async with httpx.AsyncClient(timeout=self.provider.timeout_ms / 1000) as client:
                response = await client.post(
                    f"{self.provider.api_base_url}/search",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files={"image": ("image.jpg", image_data, "image/jpeg")},
                    data={"hash": image_hash} if image_hash else {},
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", data.get("matches", []))
                    return [self._normalize_result(r) for r in results]
                else:
                    logger.warning(
                        "Provider returned error",
                        provider=self.provider.name,
                        status=response.status_code,
                    )
                    return []
        except Exception as e:
            logger.error("Provider search failed", provider=self.provider.name, error=str(e))
            return []
