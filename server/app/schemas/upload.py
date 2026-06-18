from pydantic import BaseModel
from typing import Optional


class PresignRequest(BaseModel):
    filename: str
    filesize: int
    content_type: str = "video/mp4"


class PresignResponse(BaseModel):
    upload_id: str
    presign_url: str
    callback_url: str
    expires_in: int


class UploadCallbackRequest(BaseModel):
    upload_id: str
    file_key: str
    file_size: int
    duration: float
