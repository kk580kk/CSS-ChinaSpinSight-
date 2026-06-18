from minio import Minio
from minio.error import S3Error
from datetime import timedelta
from app.config import get_settings
import uuid

settings = get_settings()

minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE
)


def ensure_bucket():
    try:
        if not minio_client.bucket_exists(settings.MINIO_BUCKET):
            minio_client.make_bucket(settings.MINIO_BUCKET)
    except S3Error as e:
        print(f"Bucket error: {e}")


def generate_presigned_url(user_id: str, filename: str, expires: int = 600) -> tuple:
    ensure_bucket()
    file_key = f"videos/{user_id}/{uuid.uuid4().hex}_{filename}"
    
    try:
        url = minio_client.presigned_put_object(
            settings.MINIO_BUCKET,
            file_key,
            expires=timedelta(seconds=expires)
        )
        return file_key, url
    except S3Error as e:
        raise Exception(f"Failed to generate presigned URL: {e}")


def get_file_url(file_key: str, expires: int = 3600) -> str:
    try:
        url = minio_client.presigned_get_object(
            settings.MINIO_BUCKET,
            file_key,
            expires=timedelta(seconds=expires)
        )
        return url
    except S3Error:
        return ""
