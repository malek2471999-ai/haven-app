from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class SearchProvider(Base):
    __tablename__ = "search_providers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    api_base_url = Column(Text, nullable=False)
    api_key_encrypted = Column(Text)
    api_secret_encrypted = Column(Text)
    is_enabled = Column(Boolean, default=False)
    supports_face_search = Column(Boolean, default=False)
    supports_visual_search = Column(Boolean, default=True)
    supports_web_search = Column(Boolean, default=False)
    daily_quota = Column(Integer, default=1000)
    requests_today = Column(Integer, default=0)
    timeout_ms = Column(Integer, default=30000)
    priority = Column(Integer, default=0)
    last_health_check = Column(DateTime(timezone=True))
    health_status = Column(String(20), default="unknown")
    avg_latency_ms = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ProviderLog(Base):
    __tablename__ = "provider_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id = Column(UUID(as_uuid=True), index=True)
    search_id = Column(UUID(as_uuid=True))
    request_url = Column(Text)
    request_method = Column(String(10))
    request_headers = Column(JSONB)
    response_status = Column(Integer)
    response_time_ms = Column(Integer)
    response_body_summary = Column(Text)
    error_code = Column(String(50))
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
