"""SauceNAO search provider adapter."""
from typing import Dict, Any, List, Optional
import httpx
import structlog
import aiofiles
from app.services.search_providers.base import BaseProviderAdapter

logger = structlog.get_logger()


class SaucenaoProviderAdapter(BaseProviderAdapter):
    """Adapter for SauceNAO reverse image search (requires API key)."""

    API_URL = "https://saucenao.com/search.php"

    async def test_connection(self) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "status": "invalid_credentials",
                "message": "SauceNAO API key not configured. Get one at https://saucenao.com/userdb.php",
            }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    self.API_URL,
                    params={"output_type": "2", "numres": "1", "api_key": self.api_key},
                )
                if response.status_code == 200:
                    return {"status": "connected", "message": "SauceNAO connected"}
                return {"status": "degraded", "message": f"Status {response.status_code}"}
        except Exception as e:
            return {"status": "offline", "message": str(e)}

    async def search_by_image(
        self,
        image_path: str,
        image_hash: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if not self.api_key:
            logger.info("SauceNAO API key not configured, skipping")
            return []

        try:
            async with aiofiles.open(image_path, "rb") as f:
                image_data = await f.read()

            files = {"file": ("image.jpg", image_data, "image/jpeg")}
            params = {"output_type": "2", "numres": "10", "api_key": self.api_key}

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(self.API_URL, params=params, files=files)

                if response.status_code != 200:
                    logger.warning("SauceNAO error", status=response.status_code)
                    return []

                data = response.json()
                raw_results = data.get("results", [])
                results = []

                for r in raw_results:
                    header = r.get("header", {})
                    rdata = r.get("data", {})
                    similarity = float(header.get("similarity", 0))
                    if similarity < 30:
                        continue

                    ext_urls = rdata.get("ext_urls", [])
                    source_url = ext_urls[0] if ext_urls else rdata.get("source", "")
                    if not source_url:
                        continue

                    thumbnail = header.get("thumbnail", "")
                    title = rdata.get("title", rdata.get("source", "Result"))
                    index_name = header.get("index_name", "")

                    results.append(self._normalize_result({
                        "source_url": source_url,
                        "image_url": rdata.get("thumbnail", thumbnail),
                        "thumbnail_url": thumbnail,
                        "page_title": title,
                        "page_description": f"Similarity: {similarity:.1f}% - {index_name}",
                        "domain": source_url.split("/")[2] if "/" in source_url else "",
                        "source_type": "image",
                        "confidence": similarity / 100.0,
                        "image_hash": rdata.get("hash", image_hash),
                    }))

                return results

        except Exception as e:
            logger.error("SauceNAO search failed", error=str(e))
            return []
