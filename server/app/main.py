from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.base import Base, engine
from app.api.v1 import auth, upload, detect, user

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ChinaSpinSight API",
    description="AI Ping Pong Spin Detection API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(upload.router, prefix="/api/v1/upload", tags=["upload"])
app.include_router(detect.router, prefix="/api/v1/detect", tags=["detect"])
app.include_router(user.router, prefix="/api/v1/user", tags=["user"])


@app.get("/")
async def root():
    return {"message": "ChinaSpinSight API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
