from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import settings
from ..database import get_db
from ..models.user import User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
# auto_error=False: the Authorization header is optional now, the session cookie is the main route.
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/admin/login", auto_error=False)

COOKIE_NAME = "tsb_session"
SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

def hash_password(p: str) -> str: return pwd.hash(p)
def verify_password(p: str, h: str) -> bool: return pwd.verify(p, h)

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_admin(request: Request, bearer: Optional[str] = Depends(oauth2),
                      db: Session = Depends(get_db)) -> User:
    cred_err = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token",
                             headers={"WWW-Authenticate": "Bearer"})
    token = bearer
    if not token:
        token = request.cookies.get(COOKIE_NAME)
        # Cookie sessions need CSRF protection on anything that changes data. A browser form on
        # another website cannot add this custom header, and CORS stops other sites from sending it.
        if token and request.method not in SAFE_METHODS:
            if request.headers.get("x-requested-with") != "XMLHttpRequest":
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Missing required request header.")
    if not token:
        raise cred_err
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise cred_err
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise cred_err
    return user

def require_roles(*roles):
    def checker(user: User = Depends(get_current_admin)) -> User:
        if user.role not in roles and user.role != "SUPER_ADMIN":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user
    return checker