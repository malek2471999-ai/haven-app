from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from pgvector.sqlalchemy import Vector
import uuid

class Search(Base):
    __tablename__ = "searches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), index=True)
    status = Column(String(20), default="queued")
    consent_confirmed = Column(Boolean, default=False)
    original_filename = Column(String(255))
    original_image_url = Column(Text)
    processed_image_url = Column(Text)
    image_width = Column(Integer)
    image_height = Column(Integer)
    image_hash = Column(String(64))
    face_detected = Column(Boolean, default=False)
    face_count = Column(Integer, default=0)
    face_bbox = Column(JSONB)
    selected_region = Column(JSONB)
    quality_score = Column(Float)
    quality_warnings = Column(JSONB, default=list)
    providers_used = Column(JSONB, default=list)
    total_results = Column(Integer, default=0)
    best_similarity = Column(Float, default=0)
    search_duration_ms = Column(Integer)
    is_private = Column(Boolean, default=False)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    results = relationship("SearchResult", back_populates="search", cascade="all, delete-orphan")

class SearchResult(Base):
    __tablename__ = "search_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    search_id = Column(UUID(as_uuid=True), ForeignKey("searches.id"), index=True)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("search_providers.id"), nullable=True)
    source_url = Column(Text, nullable=False)
    image_url = Column(Text)
    thumbnail_url = Column(Text)
    page_title = Column(Text)
    page_description = Column(Text)
    domain = Column(String(255))
    source_type = Column(String(50))
    visual_similarity = Column(Float)
    image_hash_similarity = Column(Float)
    face_region_similarity = Column(Float)
    final_score = Column(Float)
    result_category = Column(String(20))
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(UUID(as_uuid=True))
    discovered_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    search = relationship("Search", back_populates="results")
