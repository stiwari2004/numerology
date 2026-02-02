"""
User Management API endpoints (CRUD operations)
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional, List
from database.connection import get_db
from services.user_service import UserService
from utils.dependencies import get_current_tenant_id, get_current_user, get_current_admin_user
from database.models import User
import logging

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


# Request/Response Models
class UserCreateRequest(BaseModel):
    """Create user request"""
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_admin: bool = False


class UserUpdateRequest(BaseModel):
    """Update user request"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserResponse(BaseModel):
    """User information response"""
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    is_admin: bool
    is_active: bool
    last_login: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Paginated user list response"""
    users: List[UserResponse]
    total: int
    skip: int
    limit: int


@router.get("", response_model=UserListResponse)
async def list_users(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List users for the current tenant (admin only)
    """
    # Verify admin access
    get_current_admin_user(get_current_user(request, credentials=credentials.credentials, db=db))
    
    # Get tenant_id
    tenant_id = get_current_tenant_id(request)
    
    # Get users
    result = UserService.list_users(
        tenant_id=tenant_id,
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
        db=db
    )
    
    # Convert to response models
    user_responses = [
        UserResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_admin=user.is_admin,
            is_active=user.is_active,
            last_login=user.last_login.isoformat() if user.last_login else None,
            created_at=user.created_at.isoformat()
        )
        for user in result["users"]
    ]
    
    return UserListResponse(
        users=user_responses,
        total=result["total"],
        skip=result["skip"],
        limit=result["limit"]
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    request: Request,
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get user by ID (admin only, or own user)
    """
    current_user = get_current_user(request, credentials=credentials.credentials, db=db)
    tenant_id = get_current_tenant_id(request)
    
    # Allow access if user is admin or accessing own profile
    if not current_user.is_admin and str(current_user.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own profile"
        )
    
    user = UserService.get_user_by_id(user_id, tenant_id, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
        last_login=user.last_login.isoformat() if user.last_login else None,
        created_at=user.created_at.isoformat()
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def create_user(
    request: Request,
    user_data: UserCreateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Create a new user (admin only)
    """
    # Verify admin access
    get_current_admin_user(get_current_user(request, credentials=credentials.credentials, db=db))
    
    tenant_id = get_current_tenant_id(request)
    
    try:
        user = UserService.create_user(
            tenant_id=tenant_id,
            email=user_data.email,
            password=user_data.password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            is_admin=user_data.is_admin,
            db=db
        )
        
        logger.info(f"User created: {user.email} by admin")
        
        return UserResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_admin=user.is_admin,
            is_active=user.is_active,
            last_login=None,
            created_at=user.created_at.isoformat()
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    request: Request,
    user_id: str,
    user_data: UserUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Update user (admin only, or own user for non-admin fields)
    """
    current_user = get_current_user(request, credentials=credentials.credentials, db=db)
    tenant_id = get_current_tenant_id(request)
    
    # Check permissions
    if not current_user.is_admin and str(current_user.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )
    
    # Non-admins cannot change admin status or is_active
    if not current_user.is_admin:
        if user_data.is_admin is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot change admin status"
            )
        if user_data.is_active is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot change active status"
            )
    
    try:
        user = UserService.update_user(
            user_id=user_id,
            tenant_id=tenant_id,
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            is_active=user_data.is_active,
            is_admin=user_data.is_admin,
            db=db
        )
        
        logger.info(f"User updated: {user_id}")
        
        return UserResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_admin=user.is_admin,
            is_active=user.is_active,
            last_login=user.last_login.isoformat() if user.last_login else None,
            created_at=user.created_at.isoformat()
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    request: Request,
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Delete user (admin only, cannot delete self)
    """
    current_user = get_current_admin_user(
        get_current_user(request, credentials.credentials, db)
    )
    tenant_id = get_current_tenant_id(request)
    
    # Prevent self-deletion
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    try:
        UserService.delete_user(user_id, tenant_id, db)
        logger.info(f"User deleted: {user_id} by admin {current_user.id}")
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
