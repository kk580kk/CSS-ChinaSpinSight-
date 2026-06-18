from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.models.detect_record import DetectRecord
from app.models.video import Video
from app.schemas.detect import (
    DetectSubmitRequest, DetectTaskResponse, DetectStatusResponse,
    DetectResult, HistoryResponse, HistoryItem
)
from app.services.storage import get_file_url
from app.core.security import verify_token
# Import Celery app for task dispatch
try:
    from app.ai.worker import celery_app
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
import uuid
from datetime import datetime

router = APIRouter()


def get_current_user_id(token: str = "") -> str:
    try:
        return verify_token(token)
    except:
        return "test_user"


@router.post("/submit", response_model=DetectTaskResponse)
async def submit_detect(
    request: DetectSubmitRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Submit detection task"""
    try:
        task_id = uuid.uuid4().hex[:32]
        record_id = uuid.uuid4().hex[:32]
        video_id = uuid.uuid4().hex[:32]
        
        # Create video record
        video = Video(
            id=video_id,
            file_key=request.file_key,
            duration=request.device_info.duration if request.device_info else None
        )
        db.add(video)
        
        # Create detection record
        record = DetectRecord(
            id=record_id,
            user_id=user_id,
            video_id=video_id,
            task_id=task_id,
            status="pending"
        )
        db.add(record)
        db.commit()
        
        # Trigger Celery task for async processing
        if CELERY_AVAILABLE:
            try:
                celery_app.send_task(
                    "app.ai.worker.process_detection",
                    args=[task_id],
                    task_id=task_id
                )
            except Exception as e:
                print(f"Failed to trigger Celery task: {e}")
        else:
            # Fallback: mark as processing without async
            record.status = "processing"
            db.commit()
        
        return DetectTaskResponse(
            task_id=task_id,
            status="pending",
            created_at=datetime.now()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/status/{task_id}", response_model=DetectStatusResponse)
async def get_detect_status(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Get detection task status"""
    record = db.query(DetectRecord).filter(DetectRecord.task_id == task_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    result = None
    if record.status == "completed" and record.spin_rounds:
        result = DetectResult(
            spin_rounds=float(record.spin_rounds),
            confidence=float(record.confidence) if record.confidence else 0,
            duration=float(record.duration) if record.duration else 0,
            trajectory=record.trajectory
        )
    
    return DetectStatusResponse(
        task_id=task_id,
        status=record.status,
        progress=100 if record.status == "completed" else 50,
        result=result,
        created_at=record.created_at,
        completed_at=record.completed_at
    )


@router.get("/result/{task_id}", response_model=DetectResult)
async def get_detect_result(
    task_id: str,
    db: Session = Depends(get_db)
):
    """Get detection result"""
    record = db.query(DetectRecord).filter(DetectRecord.task_id == task_id).first()
    
    if not record or record.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found or not ready"
        )
    
    return DetectResult(
        spin_rounds=float(record.spin_rounds),
        confidence=float(record.confidence) if record.confidence else 0,
        duration=float(record.duration) if record.duration else 0,
        trajectory=record.trajectory
    )


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    page: int = 1,
    size: int = 20,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get user detection history"""
    from sqlalchemy import func
    
    total = db.query(func.count(DetectRecord.id)).filter(
        DetectRecord.user_id == user_id
    ).scalar()
    
    records = db.query(DetectRecord).filter(
        DetectRecord.user_id == user_id
    ).order_by(DetectRecord.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    items = []
    for record in records:
        items.append(HistoryItem(
            id=record.id,
            task_id=record.task_id,
            spin_rounds=float(record.spin_rounds) if record.spin_rounds else 0,
            confidence=float(record.confidence) if record.confidence else 0,
            duration=float(record.duration) if record.duration else 0,
            created_at=record.created_at,
            thumbnail_url=None
        ))
    
    return HistoryResponse(
        total=total,
        page=page,
        size=size,
        items=items
    )


@router.delete("/history/{record_id}")
async def delete_history(
    record_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete history record"""
    record = db.query(DetectRecord).filter(
        DetectRecord.id == record_id,
        DetectRecord.user_id == user_id
    ).first()
    
    if record:
        db.delete(record)
        db.commit()
    
    return {"code": 0, "message": "success"}
