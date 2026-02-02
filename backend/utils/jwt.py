"""
JWT Token utilities for authentication
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from fastapi import HTTPException, status
import os
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-min-32-chars")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Dictionary containing user data (user_id, tenant_id, email, is_admin)
        expires_delta: Optional expiration time delta
    
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict:
    """
    Decode and verify JWT access token
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token payload dictionary
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_token_from_header(authorization: Optional[str]) -> str:
    """
    Extract token from Authorization header or raw token.
    
    Args:
        authorization: Either "Bearer <token>" or the raw token string (e.g. from HTTPBearer().credentials)
    
    Returns:
        Token string
    
    Raises:
        HTTPException: If header is missing or invalid
    """
    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    value = authorization.strip()
    parts = value.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    if len(parts) == 1 and "." in value:
        return value
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authorization header format. Expected: Bearer <token>",
        headers={"WWW-Authenticate": "Bearer"},
    )
