from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID

class SearchCreateRequest(BaseModel):
    consent_confirmed: bool
    is_private: bool = False
    selected_region: Optional[Dict[str, Any]] = None

class SearchResponse(BaseModel):
    search_id: str
    status: str
    message: Optional[str] = None

class SearchStatusResponse(BaseModel):
    search_id: str
    status: str
    progress: Optional[int] = None
    current_stage: Optional[str] = None
    total_results: Optional[int] = None
    error_message: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None

class SearchResultItem(BaseModel):
    id: str
    source_url: str
    image_url: Optional[str]
    thumbnail_url: Optional[str]
    page_title: Optional[str]
    page_description: Optional[str]
    domain: Optional[str]
    source_type: Optional[str]
    visual_similarity: Optional[float]
    image_hash_similarity: Optional[float]
    face_region_similarity: Optional[float]
    final_score: Optional[float]
    result_category: Optional[str]
    discovered_at: str

class SearchResultsResponse(BaseModel):
    search_id: str
    status: str
    total_results: int
    results: List[SearchResultItem]
    providers_used: List[str]
    best_similarity: Optional[float]

class HistoryItem(BaseModel):
    id: str
    thumbnail_url: Optional[str]
    created_at: str
    total_results: int
    best_similarity: Optional[float]
    status: str
