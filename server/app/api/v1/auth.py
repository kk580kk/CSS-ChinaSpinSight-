from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.models.user import User
from app.schemas.user import WechatLoginRequest, TokenResponse, UserResponse
from app.services.wechat import get_access_token, get_user_info
from app.core.security import create_access_token, create_refresh_token
from app.config import get_settings
import uuid

router = APIRouter()
settings = get_settings()


@router.post("/wechat-login", response_model=TokenResponse)
async def wechat_login(
    request: WechatLoginRequest,
    db: Session = Depends(get_db)
):
    """WeChat mini program login"""
    try:
        # Get WeChat access token and openid
        wx_data = await get_access_token(request.code)
        openid = wx_data.get("openid")
        
        if not openid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid WeChat code"
            )
        
        # Check if user exists
        user = db.query(User).filter(User.openid == openid).first()
        
        if not user:
            # Get user info from WeChat
            try:
                user_info = await get_user_info(
                    wx_data.get("access_token"),
                    openid
                )
            except:
                user_info = {}
            
            # Create new user
            user = User(
                id=uuid.uuid4().hex[:32],
                openid=openid,
                unionid=wx_data.get("unionid"),
                nickname=user_info.get("nickname"),
                avatar_url=user_info.get("headimgurl")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Generate tokens
        access_token = create_access_token(user.id)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.JWT_EXPIRE_DAYS * 86400,
            user=UserResponse.from_orm(user)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/refresh")
async def refresh_token():
    """Refresh access token"""
    # TODO: Implement token refresh
    pass
