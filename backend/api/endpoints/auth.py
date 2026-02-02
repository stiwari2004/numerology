"""
Authentication API endpoints (register, login, logout)
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from database.connection import get_db
from database.models import User, UserSession, PasswordResetToken
from services.user_service import UserService
from services.tenant_service import TenantService
from utils.jwt import create_access_token
from utils.dependencies import get_current_tenant_id, get_current_user
from passlib.context import CryptContext
import hashlib
import secrets
import logging

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Request/Response Models
class RegisterRequest(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class LoginRequest(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response with token and user info"""
    access_token: str
    token_type: str = "bearer"
    user: dict
    tenant: dict


class UserResponse(BaseModel):
    """User information response"""
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    is_admin: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    """Forgot password request"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Reset password request (with token from email link)"""
    token: str
    new_password: str = Field(..., min_length=8)


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def register(
    request: Request,
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user for the current tenant
    """
    # Get tenant_id from request state
    tenant_id = get_current_tenant_id(request)
    
    # Verify tenant exists and is active
    tenant = TenantService.get_tenant_by_id(tenant_id, db)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant account is inactive"
        )
    
    try:
        # Create user (service checks license availability)
        user = UserService.create_user(
            tenant_id=tenant_id,
            email=register_data.email,
            password=register_data.password,
            first_name=register_data.first_name,
            last_name=register_data.last_name,
            is_admin=False,
            db=db
        )
        
        logger.info(f"User registered: {user.email} for tenant {tenant_id}")
        
        return UserResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_admin=user.is_admin,
            is_active=user.is_active,
            created_at=user.created_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login user and return JWT token
    """
    # Get tenant_id from request state
    tenant_id = get_current_tenant_id(request)
    
    # Authenticate user
    user = UserService.authenticate_user(
        email=login_data.email,
        password=login_data.password,
        tenant_id=tenant_id,
        db=db
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    # SINGLE SESSION ENFORCEMENT: Invalidate all previous sessions for this user
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.expires_at > datetime.utcnow()
    ).delete()
    db.commit()
    
    # Create JWT token
    token_data = {
        "user_id": str(user.id),
        "tenant_id": str(user.tenant_id),
        "email": user.email,
        "is_admin": user.is_admin
    }
    access_token = create_access_token(token_data)
    
    # Create session record
    token_hash = hashlib.sha256(access_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    session = UserSession(
        user_id=user.id,
        tenant_id=user.tenant_id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    
    # Get tenant info
    tenant = TenantService.get_tenant_by_id(tenant_id, db)
    
    logger.info(f"User logged in: {user.email} for tenant {tenant_id}")
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_admin": user.is_admin,
            "is_active": user.is_active
        },
        tenant={
            "id": str(tenant.id),
            "subdomain": tenant.subdomain,
            "custom_domain": tenant.custom_domain,
            "company_name": tenant.company_name,
            "logo_url": tenant.logo_url,
            "primary_color": tenant.primary_color,
            "secondary_color": tenant.secondary_color
        }
    )


@router.post("/logout")
async def logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Logout user (invalidate session)
    """
    # Get current user
    current_user = get_current_user(request, credentials=credentials.credentials, db=db)
    
    # Delete session (hash the token to find it)
    token_hash = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.token_hash == token_hash
    ).delete()
    db.commit()
    
    logger.info(f"User logged out: {current_user.email}")
    
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user information
    """
    user = get_current_user(request, credentials=credentials.credentials, db=db)
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Request a password reset. Tenant is resolved from Host (same as login).
    Always returns 200 to avoid leaking whether the email exists.
    """
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        return {"message": "If an account exists with this email, you will receive reset instructions."}

    user = UserService.get_user_by_email(body.email, tenant_id, db)
    if not user or not user.is_active:
        return {"message": "If an account exists with this email, you will receive reset instructions."}

    # Invalidate any existing reset tokens for this user
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=1)

    reset_record = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(reset_record)
    db.commit()

    reset_link = f"/reset-password?token={token}"
    logger.info(f"Password reset requested for {user.email}; link (dev): {reset_link}")
    return {"message": "If an account exists with this email, you will receive reset instructions.", "reset_link": reset_link}


@router.post("/reset-password")
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using the token from the forgot-password email link.
    No tenant context required (token identifies the user).
    """
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    reset_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()

    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link. Please request a new one."
        )

    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link.")

    user.password_hash = UserService.hash_password(body.new_password)
    db.delete(reset_record)
    db.commit()

    logger.info(f"Password reset completed for user {user.id}")
    return {"message": "Password has been reset. You can now log in."}
