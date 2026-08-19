from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    
    DATABASE_URL: str = "postgresql://bab_user:bab_password@localhost:5432/bab_db"
    
    STORAGE_URL: str = "http://localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "bab-uploads"
    
    APP_SECRET: str = "change-this-to-a-secure-random-string"
    JWT_SECRET: str = "change-this-to-a-secure-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    
    PROVIDER_MASTER_ENCRYPTION_KEY: str = "change-this-to-32-byte-key-for-encryption"
    
    RATE_LIMIT_SEARCH_PER_MINUTE: int = 5
    RATE_LIMIT_SEARCH_PER_DAY: int = 50
    RATE_LIMIT_CONCURRENT_SEARCHES: int = 2
    
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_FILE_TYPES: str = "image/jpeg,image/png,image/webp,image/heic"
    
    AUTO_DELETE_AFTER_SEARCH: bool = True
    TEMP_FILE_RETENTION_HOURS: int = 24
    
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    DEMO_MODE: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

ALLOWED_MIME_TYPES = [t.strip() for t in settings.ALLOWED_FILE_TYPES.split(",")]
MAX_FILE_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024
