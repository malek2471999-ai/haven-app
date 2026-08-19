"""Web-based reverse image search using free services."""
from typing import Dict, Any, List, Optional
import httpx
import structlog
import aiofiles
import os
from app.services.search_providers.base import BaseProviderAdapter

logger = structlog.get_logger()


class WebSearchProviderAdapter(BaseProviderAdapter):
    """Search using free web-based reverse image search engines.
    
    Uploads image to a temp host, then constructs search URLs
    for Google Lens, Yandex, TinEye etc.
    """

    TEMP_HOSTS = [
        "https://catbox.moe/user/api.php",
        "https://tmpfiles.org/api/v1/upload",
    ]

    async def test_connection(self) -> Dict[str, Any]:
        return {
            "status": "connected",
            "message": "Web search adapter (Google Lens, Yandex, TinEye URLs)",
        }

    async def _upload_to_temp(self, image_data: bytes) -> Optional[str]:
        """Upload image to a temp file host and return the URL."""
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            # Try catbox.moe first
            try:
                files = {"fileToUpload": ("image.jpg", image_data, "image/jpeg")}
                data = {"reqtype": "fileupload"}

                r = await client.post(
                    "https://catbox.moe/user/api.php",
                    data=data,
                    files=files,
                )
                if r.status_code == 200 and r.text.strip().startswith("http"):
                    return r.text.strip()
            except Exception as e:
                logger.warning("catbox upload failed", error=str(e))

            # Try tmpfiles.org
            try:
                files = {"file": ("image.jpg", image_data, "image/jpeg")}
                r = await client.post(
                    "https://tmpfiles.org/api/v1/upload",
                    files=files,
                )
                if r.status_code == 200:
                    data = r.json()
                    if data.get("data", {}).get("url"):
                        url = data["data"]["url"]
                        return url.replace("tmpfiles.org/", "tmpfiles.org/dl/")
            except Exception as e:
                logger.warning("tmpfiles upload failed", error=str(e))

        return None

    async def search_by_image(
        self,
        image_path: str,
        image_hash: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        try:
            async with aiofiles.open(image_path, "rb") as f:
                image_data = await f.read()

            image_url = await self._upload_to_temp(image_data)
            if not image_url:
                logger.error("Failed to upload image to temp host")
                return []

            logger.info("Image uploaded", url=image_url)

            # Construct search URLs for different engines
            encoded_url = httpx.URL(image_url)
            
            results = [
                self._normalize_result({
                    "source_url": f"https://lens.google.com/uploadbyurl?url={image_url}",
                    "image_url": image_url,
                    "thumbnail_url": image_url,
                    "page_title": "Google Lens - Reverse Image Search",
                    "page_description": "Search this image on Google Lens",
                    "domain": "lens.google.com",
                    "source_type": "website",
                    "confidence": 0.5,
                }),
                self._normalize_result({
                    "source_url": f"https://yandex.com/images/search?rpt=imageview&url={image_url}",
                    "image_url": image_url,
                    "thumbnail_url": image_url,
                    "page_title": "Yandex Images - Reverse Image Search",
                    "page_description": "Search this image on Yandex",
                    "domain": "yandex.com",
                    "source_type": "website",
                    "confidence": 0.5,
                }),
                self._normalize_result({
                    "source_url": f"https://www.google.com/searchbyimage?sbisrc=tg&image_url={image_url}",
                    "image_url": image_url,
                    "thumbnail_url": image_url,
                    "page_title": "Google Images - Reverse Image Search",
                    "page_description": "Search this image on Google Images",
                    "domain": "google.com",
                    "source_type": "website",
                    "confidence": 0.5,
                }),
                self._normalize_result({
                    "source_url": f"https://tineye.com/search?url={image_url}",
                    "image_url": image_url,
                    "thumbnail_url": image_url,
                    "page_title": "TinEye - Reverse Image Search",
                    "page_description": "Search this image on TinEye",
                    "domain": "tineye.com",
                    "source_type": "website",
                    "confidence": 0.5,
                }),
                self._normalize_result({
                    "source_url": f"https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:{image_url}",
                    "image_url": image_url,
                    "thumbnail_url": image_url,
                    "page_title": "Bing Visual Search",
                    "page_description": "Search this image on Bing",
                    "domain": "bing.com",
                    "source_type": "website",
                    "confidence": 0.5,
                }),
            ]

            return results

        except Exception as e:
            logger.error("Web search failed", error=str(e))
            return []
