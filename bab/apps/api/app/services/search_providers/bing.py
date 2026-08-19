"""Bing reverse image search provider adapter."""
from typing import Dict, Any, List, Optional
import httpx
import structlog
from app.services.search_providers.base import BaseProviderAdapter

logger = structlog.get_logger()

class BingProviderAdapter(BaseProviderAdapter):
    """Adapter for Bing-compatible reverse image search APIs."""
    
    async def test_connection(self) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "status": "invalid_credentials",
                "message": "Bing API key not configured. Search provider not configured.",
            }
        
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self.provider.api_base_url}/status",
                    headers={"Ocp-Apim-Subscription-Key": self.api_key}
                )
                if response.status_code == 200:
                    return {
                        "status": "connected",
                        "message": "Bing Visual Search API connected",
                        "latency_ms": int(response.elapsed.total_seconds() * 1000),
                    }
                return {"status": "degraded", "message": f"Status: {response.status_code}"}
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
                    f"{self.provider.api_base_url}/visualsearch/v7.0/search",
                    headers={
                        "Ocp-Apim-Subscription-Key": self.api_key,
                        "Content-Type": "multipart/form-data",
                    },
                    files={"image": ("image.jpg", image_data, "image/jpeg")},
                )
                
                if response.status_code == 200:
                    data = response.json()
                    tags = data.get("tags", [])
                    results = []
                    for tag in tags:
                        for item in tag.get("matches", tag.get("results", [])):
                            results.append(self._normalize_result({
                                "source_url": item.get("hostPageUrl", ""),
                                "image_url": item.get("contentUrl"),
                                "thumbnail_url": item.get("thumbnailUrl", {}).get("thumbUrl"),
                                "page_title": item.get("name"),
                                "page_description": item.get("hostPageDisplayText"),
                                "domain": item.get("hostPageDomain"),
                                "source_type": "image" if "image" in tag.get("name", "").lower() else "website",
                            }))
                    return results
                return []
        except Exception as e:
            logger.error("Bing search failed", error=str(e))
            return []
