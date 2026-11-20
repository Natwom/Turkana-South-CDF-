import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import settings
from ..database import get_db
from ..models.user import User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# Verified against when the username does not exist, so response time does not
# reveal whether an account exists.
DUMMY_HASH = pwd.hash(secrets.token_urlsafe(16))

_COMMON = {"changeme!123", "password123!", "admin@12345", "welcome@123"}


def hash_password(p: str) -> str:
    return pwd.hash(p)


def verify_password(p: str, h: str) -> bool:
    try:
        return pwd.verify(p, h)
    except Exception:
        return False


def validate_password_strength(p: str, username: str = "") -> Optional[str]:
    """Returns an error message, or None if the password is acceptable."""
    if len(p) < 12:
        return "Password must be at least 12 characters."
    if len(p.encode()) > 72:
        return "Password must be at most 72 characters."
    classes = sum([any(c.islower() for c in p), any(c.isupper() for c in p),
                   any(c.isdigit() for c in p), any(c in string.punctuation for c in p)])
    if classes < 3:
        return "Use at least three of: lowercase, uppercase, digits, symbols."
    if p.lower() in _COMMON or (username and username.lower() in p.lower()):
        return "Password is too easy to guess."
    return None


def create_token(data: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = data.copy()
    payload.update({"iat": now, "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
                    "jti": secrets.token_hex(8)})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def check_csrf(request: Request) -> None:
    """Cookie auth needs CSRF defence. Besides SameSite=Strict on the cookie, every
    state-changing request must carry a custom header (browsers will not let other
    sites add it without a CORS preflight) and a trusted Origin if one is sent."""
    if request.method in _SAFE_METHODS:
        return
    if request.headers.get("x-requested-with") != "XMLHttpRequest":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Missing request header.")
    origin = request.headers.get("origin")
    if origin and origin not in settings.cors_list:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Untrusted origin.")


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> User:
    cred_err = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise cred_err
    check_csrf(request)
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],
                             options={"require_exp": True})
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