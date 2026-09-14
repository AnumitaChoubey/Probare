from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "RS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], roles: list[str], full_name: str, expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "user_id": str(subject),
        "roles": roles,
        "full_name": full_name
    }
    
    if not settings.JWT_PRIVATE_KEY:
        raise ValueError("JWT_PRIVATE_KEY is not set. Cannot sign tokens.")
        
    encoded_jwt = jwt.encode(to_encode, settings.JWT_PRIVATE_KEY, algorithm=ALGORITHM)
    return encoded_jwt
