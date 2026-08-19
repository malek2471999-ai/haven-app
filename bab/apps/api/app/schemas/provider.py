from pydantic import BaseModel
from typing import Optional

class ProviderCreate(BaseModel):
    name: str
    slug: str
    api_base_url: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    daily_quota: int = 1000
    timeout_ms: int = 30000
    is_enabled: bool = False
    supports_visual_search: bool = True
    supports_face_search: bool = False
    supports_web_search: bool = False

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    api_base_url: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    daily_quota: Optional[int] = None
    timeout_ms: Optional[int] = None
    is_enabled: Optional[bool] = None
    supports_visual_search: Optional[bool] = None
    supports_face_search: Optional[bool] = None
    supports_web_search: Optional[bool] = None

class ProviderResponse(BaseModel):
    id: str
    name: str
    slug: str
    api_base_url: str
    is_enabled: bool
    health_status: str
    requests_today: int
    daily_quota: int
    avg_latency_ms: int
    supports_visual_search: bool
    supports_face_search: bool
    supports_web_search: bool
    created_at: str

class ProviderTestResponse(BaseModel):
    status: str
    message: str
    latency_ms: Optional[int] = None
