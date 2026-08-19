from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True))
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(UUID(as_uuid=True))
    details = Column(JSONB)
    ip_address = Column(INET)
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ErrorLog(Base):
    __tablename__ = "error_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service = Column(String(100), nullable=False)
    endpoint = Column(String(255))
    error_code = Column(String(50))
    message = Column(Text, nullable=False)
    stack_trace = Column(Text)
    request_id = Column(String(100))
    user_id = Column(UUID(as_uuid=True))
    provider_id = Column(UUID(as_uuid=True))
    severity = Column(String(20), default="error")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
