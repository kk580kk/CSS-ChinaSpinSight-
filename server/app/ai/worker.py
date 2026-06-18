from celery import Celery
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.base import SessionLocal
from app.models.detect_record import DetectRecord
from app.models.video import Video
from app.ai.spin import SpinDetector
from app.services.storage import get_file_url
import tempfile
import requests
import os

settings = get_settings()

# Configure Celery
celery_app = Celery(
    "chinaspinsight",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
)


@celery_app.task(bind=True, max_retries=3)
def process_detection(self, task_id: str):
    """Process detection task"""
    db = SessionLocal()
    
    try:
        # Get record
        record = db.query(DetectRecord).filter(
            DetectRecord.task_id == task_id
        ).first()
        
        if not record:
            raise Exception(f"Task {task_id} not found")
        
        # Update status
        record.status = "processing"
        db.commit()
        
        # Get video
        video = db.query(Video).filter(Video.id == record.video_id).first()
        if not video:
            raise Exception(f"Video not found for task {task_id}")
        
        # Download video
        video_url = get_file_url(video.file_key, expires=3600)
        
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            response = requests.get(video_url, stream=True)
            for chunk in response.iter_content(chunk_size=8192):
                tmp.write(chunk)
            tmp_path = tmp.name
        
        try:
            # Process video
            detector = SpinDetector()
            result = detector.detect_spin(tmp_path)
            
            # Update record
            record.spin_rounds = result.spin_rounds
            record.confidence = result.confidence
            record.duration = result.duration
            record.trajectory = result.trajectory
            record.status = "completed"
            
            from datetime import datetime
            record.completed_at = datetime.now()
            
            db.commit()
            
            return {
                "task_id": task_id,
                "spin_rounds": result.spin_rounds,
                "confidence": result.confidence,
                "status": "completed"
            }
            
        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as exc:
        # Update status to failed
        if record:
            record.status = "failed"
            record.error_msg = str(exc)
            db.commit()
        
        # Retry
        raise self.retry(exc=exc, countdown=60)
        
    finally:
        db.close()
