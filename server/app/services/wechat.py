import httpx
from app.config import get_settings

settings = get_settings()

WECHAT_API_BASE = "https://api.weixin.qq.com/sns"


async def get_access_token(code: str) -> dict:
    """Exchange WeChat auth code for access token and user info"""
    url = f"{WECHAT_API_BASE}/oauth2/access_token"
    params = {
        "appid": settings.WECHAT_APPID,
        "secret": settings.WECHAT_SECRET,
        "code": code,
        "grant_type": "authorization_code"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()
        
        if "errcode" in data:
            raise Exception(f"WeChat API error: {data}")
        
        return data


async def get_user_info(access_token: str, openid: str) -> dict:
    """Get WeChat user info"""
    url = f"{WECHAT_API_BASE}/userinfo"
    params = {
        "access_token": access_token,
        "openid": openid
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()
        
        if "errcode" in data:
            raise Exception(f"WeChat API error: {data}")
        
        return data
