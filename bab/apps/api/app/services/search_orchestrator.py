"""Search orchestrator - coordinates search across providers."""
import time
from datetime import datetime, timezone
import structlog
from typing import List, Dict, Any
from sqlalchemy import select
from app.core.database import async_session_factory
from app.models.search import Search, SearchResult
from app.models.provider import SearchProvider
from app.services.image_processor import image_processor
from app.services.similarity_engine import similarity_engine
from app.services.search_providers import get_active_providers, search_with_provider

logger = structlog.get_logger()

class SearchOrchestrator:
    """Orchestrates search across multiple providers."""
    
    async def process_search(self, search_id: str):
        """Process a search job end-to-end."""
        start_time = time.time()
        logger.info("Starting search", search_id=search_id)
        
        try:
            async with async_session_factory() as db:
                result = await db.execute(select(Search).where(Search.id == search_id))
                search = result.scalar_one_or_none()
                
                if not search:
                    logger.error("Search not found", search_id=search_id)
                    return
                
                try:
                    search.status = "processing"
                    await db.commit()
                    
                    image_data = await image_processor.process(search.original_image_url)
                    logger.info("Image processed", search_id=search_id)
                    
                    search.image_width = image_data["width"]
                    search.image_height = image_data["height"]
                    search.image_hash = image_data["image_hash"]
                    search.quality_score = image_data["quality_score"]
                    search.quality_warnings = image_data["quality_warnings"]
                    search.face_detected = image_data["face_detected"]
                    search.face_count = image_data["face_count"]
                    search.face_bbox = image_data["face_bbox"]
                    search.processed_image_url = image_data.get("processed_path", search.original_image_url)
                    await db.commit()
                    
                    providers = await get_active_providers(db)
                    logger.info("Providers found", count=len(providers))
                    
                    if not providers:
                        search.status = "completed"
                        search.total_results = 0
                        search.best_similarity = 0
                        search.error_message = "No search providers configured"
                        search.completed_at = datetime.now(timezone.utc)
                        search.search_duration_ms = int((time.time() - start_time) * 1000)
                        await db.commit()
                        return
                    
                    all_results = []
                    providers_used = []
                    
                    for provider in providers:
                        try:
                            provider_results = await search_with_provider(
                                provider,
                                search.processed_image_url,
                                search.image_hash,
                            )
                            providers_used.append(provider.name)
                            logger.info("Provider done", provider=provider.name, results=len(provider_results))
                            
                            for pr in provider_results:
                                features = {"phash": search.image_hash}
                                result_features = {
                                    "phash": pr.get("image_hash"),
                                    "provider_confidence": 0.5,
                                }
                                
                                scores = await similarity_engine.calculate_similarity(features, result_features)
                                
                                db_result = SearchResult(
                                    search_id=search.id,
                                    provider_id=provider.id,
                                    source_url=pr.get("source_url", ""),
                                    image_url=pr.get("image_url"),
                                    thumbnail_url=pr.get("thumbnail_url"),
                                    page_title=pr.get("page_title"),
                                    page_description=pr.get("page_description"),
                                    domain=pr.get("domain"),
                                    source_type=pr.get("source_type", "other"),
                                    visual_similarity=scores["visual_similarity"],
                                    image_hash_similarity=scores["image_hash_similarity"],
                                    face_region_similarity=scores["face_region_similarity"],
                                    final_score=scores["final_score"],
                                    result_category=similarity_engine.categorize_result(scores["final_score"]),
                                )
                                db.add(db_result)
                                all_results.append(db_result)
                        
                        except Exception as e:
                            logger.error("Provider failed", provider=provider.name, error=str(e))
                            continue
                    
                    await self._remove_duplicates(all_results)
                    
                    search.providers_used = providers_used
                    search.total_results = len([r for r in all_results if not r.is_duplicate])
                    search.best_similarity = max(
                        (r.final_score or 0 for r in all_results), default=0
                    )
                    search.status = "completed"
                    search.completed_at = datetime.now(timezone.utc)
                    search.search_duration_ms = int((time.time() - start_time) * 1000)
                    await db.commit()
                    
                    logger.info("Search completed", search_id=search_id, results=search.total_results)
                
                except Exception as e:
                    logger.error("Search processing failed", search_id=search_id, error=str(e))
                    search.status = "failed"
                    search.error_message = str(e)
                    search.completed_at = datetime.now(timezone.utc)
                    search.search_duration_ms = int((time.time() - start_time) * 1000)
                    await db.commit()
        
        except Exception as e:
            logger.error("Search orchestrator failed", search_id=search_id, error=str(e))
    
    async def _remove_duplicates(self, results: List):
        seen_urls = {}
        seen_hashes = {}
        
        for result in results:
            if result.source_url in seen_urls:
                result.is_duplicate = True
                result.duplicate_of = seen_urls[result.source_url]
                continue
            
            if result.image_hash_similarity and result.image_hash_similarity > 0.95:
                for hash_key, original in seen_hashes.items():
                    if abs(hash_key - (result.image_hash_similarity or 0)) < 0.05:
                        result.is_duplicate = True
                        result.duplicate_of = original
                        break
            
            seen_urls[result.source_url] = result.id
            if result.image_hash_similarity:
                seen_hashes[result.image_hash_similarity] = result.id

search_orchestrator = SearchOrchestrator()
