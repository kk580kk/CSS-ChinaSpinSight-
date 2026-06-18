from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class DeviceInfo(BaseModel):
    model: Optional[str] = None
    fps: Optional[int] = None
    resolution: Optional[str] = None


class DetectSubmitRequest(BaseModel):
    file_key: str
    device_info: Optional[DeviceInfo] = None


class DetectTaskResponse(BaseModel):
    task_id: str
    status: str
    created_at: datetime


class DetectResult(BaseModel):
    spin_rounds: float
    confidence: float
    duration: float
    trajectory: Optional[List[Dict[str, Any]]] = None
    thumbnail_url: Optional[str] = None


class DetectStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: int
    result: Optional[DetectResult] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class HistoryItem(BaseModel):
    id: str
    task_id: str
    spin_rounds: float
    confidence: float
    duration: float
    created_at: datetime
    thumbnail_url: Optional[str] = None


class HistoryResponse(BaseModel):
    total: int
    page: int
    size: int
    items: List[HistoryItem]
