"""
FastAPI dependencies for authentication and tenant context
"""
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional
from database.connection import get_db
from database.models import User, SuperAdmin
from utils.jwt import decode_access_token, get_token_from_header
from services.user_service import UserService
from services.super_admin_service import SuperAdminService
import logging
import hashlib

logger = logging.getLogger(__name__)


def get_current_tenant_id(request: Request) -> str:
    """
    Get tenant_id from request state (set by TenantMiddleware)
    
    Raises:
        HTTPException: If tenant_id is not found
    """
    tenant_id = getattr(request.state, 'tenant_id', None)
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant context not found. Please ensure you're accessing via correct domain."
        )
    return tenant_id


def get_current_user(
    request: Request,
    authorization: Optional[str] = None,
    db: Session = Depends(get_db),
    credentials: Optional[str] = None
) -> User:
    """
    Get current authenticated user from JWT token
    
    Args:
        request: FastAPI request object
        authorization: Authorization header
        db: Database session
    
    Returns:
        User object
    
    Raises:
        HTTPException: If user is not authenticated or not found
    """
    # Get tenant_id from request state
    tenant_id = get_current_tenant_id(request)
    
    # Extract token from header (prefer credentials parameter if provided)
    token_str = credentials if credentials else authorization
    token = get_token_from_header(token_str)
    
    # Decode token
    payload = decode_access_token(token)
    
    # Extract user info from token
    user_id = payload.get("user_id")
    token_tenant_id = payload.get("tenant_id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user_id missing"
        )
    
    # Verify tenant_id matches
    if token_tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token tenant does not match request tenant"
        )
    
    # SINGLE SESSION VALIDATION: Verify session exists and is valid
    from database.models import UserSession
    from datetime import datetime
    
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    active_session = db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.token_hash == token_hash,
        UserSession.expires_at > datetime.utcnow()
    ).first()
    
    if not active_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please login again."
        )
    
    # Get user from database
    user = UserService.get_user_by_id(user_id, tenant_id, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current user and verify they are an admin
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        User object (admin)
    
    Raises:
        HTTPException: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def get_current_super_admin(
    request: Request,
    credentials: Optional[str] = None,
    authorization: Optional[str] = None,
    db: Session = Depends(get_db)
) -> SuperAdmin:
    """
    Get current authenticated super admin from JWT token
    (No tenant context required)
    
    Args:
        request: FastAPI request object
        credentials: Raw token from HTTPBearer() (preferred)
        authorization: Full "Bearer <token>" header string
        db: Database session
    
    Returns:
        SuperAdmin object
    
    Raises:
        HTTPException: If super admin is not authenticated or not found
    """
    # HTTPBearer() passes the raw token in credentials.credentials; use it directly
    if credentials:
        token = credentials
    elif authorization:
        token = get_token_from_header(authorization)
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Decode token
    payload = decode_access_token(token)
    
    # Extract admin info from token
    admin_id = payload.get("admin_id")
    role = payload.get("role")
    
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: admin_id missing"
        )
    
    if role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    # Get super admin from database
    admin = SuperAdminService.get_super_admin_by_id(admin_id, db)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Super admin not found"
        )
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin account is inactive"
        )
    
    return admin
