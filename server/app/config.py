from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "ChinaSpinSight"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/chinaspinsight"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minio"
    MINIO_SECRET_KEY: str = "minio123"
    MINIO_BUCKET: str = "chinaspinsight"
    MINIO_SECURE: bool = False
    
    # WeChat
    WECHAT_APPID: str = ""
    WECHAT_SECRET: str = ""
    
    # JWT
    JWT_SECRET: str = "chinaspinsight-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 1
    JWT_REFRESH_DAYS: int = 7
    
    # AI
    MODEL_PATH: str = "./models"
    DETECTION_CONFIDENCE: float = 0.5
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
