from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    openid: str
    unionid: Optional[str] = None


class UserResponse(UserBase):
    id: str
    openid: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class WechatLoginRequest(BaseModel):
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
