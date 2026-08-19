from pydantic import BaseModel
from typing import Optional, List

class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "folder"

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None

class CollectionResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    icon: str
    result_count: int
    created_at: str
    updated_at: str

class SavedResultCreate(BaseModel):
    search_id: Optional[str] = None
    result_id: Optional[str] = None
    collection_id: Optional[str] = None
    notes: Optional[str] = None

class SavedResultResponse(BaseModel):
    id: str
    search_id: Optional[str]
    result_id: Optional[str]
    collection_id: Optional[str]
    notes: Optional[str]
    created_at: str
