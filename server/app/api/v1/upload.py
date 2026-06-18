from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.schemas.upload import PresignRequest, PresignResponse, UploadCallbackRequest
from app.services.storage import generate_presigned_url
from app.core.security import verify_token
from app.config import get_settings
import uuid

router = APIRouter()
settings = get_settings()


def get_current_user_id(token: str = Depends(lambda: "")) -> str:
    """Extract user_id from token"""
    try:
        return verify_token(token)
    except:
        # For development, return a test user
        return "test_user"


@router.post("/presign", response_model=PresignResponse)
async def get_presign_url(
    request: PresignRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get presigned URL for direct upload"""
    try:
        upload_id = uuid.uuid4().hex[:32]
        file_key, presign_url = generate_presigned_url(
            user_id,
            request.filename
        )
        
        callback_url = f"{settings.MINIO_ENDPOINT}/api/v1/upload/callback"
        
        return PresignResponse(
            upload_id=upload_id,
            presign_url=presign_url,
            callback_url=callback_url,
            expires_in=600
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/callback")
async def upload_callback(
    request: UploadCallbackRequest,
    db: Session = Depends(get_db)
):
    """Handle upload completion callback"""
    # TODO: Update video record status
    return {"code": 0, "message": "success"}
