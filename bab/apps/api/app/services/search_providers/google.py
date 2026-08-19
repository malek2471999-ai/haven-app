"""Google-style reverse image search provider adapter."""
from typing import Dict, Any, List, Optional
import httpx
import structlog
from app.services.search_providers.base import BaseProviderAdapter

logger = structlog.get_logger()

class GoogleProviderAdapter(BaseProviderAdapter):
    """Adapter for Google-compatible reverse image search APIs."""
    
    async def test_connection(self) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "status": "invalid_credentials",
                "message": "Google API key not configured. Search provider not configured.",
            }
        
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self.provider.api_base_url}/test",
                    headers={"X-API-Key": self.api_key}
                )
                if response.status_code == 200:
                    return {
                        "status": "connected",
                        "message": "Google search API connected",
                        "latency_ms": int(response.elapsed.total_seconds() * 1000),
                    }
                return {
                    "status": "degraded",
                    "message": f"Status: {response.status_code}",
                }
        except Exception as e:
            return {"status": "offline", "message": str(e)}
    
    async def search_by_image(
        self,
        image_path: str,
        image_hash: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if not self.api_key:
            return []
        
        try:
            import aiofiles
            async with aiofiles.open(image_path, 'rb') as f:
                image_data = await f.read()
            
            async with httpx.AsyncClient(timeout=self.provider.timeout_ms / 1000) as client:
                response = await client.post(
                    f"{self.provider.api_base_url}/v1/search/image",
                    headers={"X-API-Key": self.api_key},
                    files={"image": ("image.jpg", image_data, "image/jpeg")},
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("visual_matches", data.get("results", []))
                    return [self._normalize_result(r) for r in results]
                return []
        except Exception as e:
            logger.error("Google search failed", error=str(e))
            return []
