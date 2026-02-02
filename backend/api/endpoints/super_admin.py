"""
Super Admin API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional, List
from database.connection import get_db
from services.super_admin_service import SuperAdminService
from services.tenant_service import TenantService
from services.user_service import UserService
from utils.dependencies import get_current_super_admin
from database.models import SuperAdmin, Tenant, PasswordResetToken
from utils.jwt import create_access_token
from datetime import datetime, timedelta
import logging
import hashlib
import secrets

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


# Request/Response Models
class SuperAdminLoginRequest(BaseModel):
    """Super admin login request"""
    email: EmailStr
    password: str


class SuperAdminLoginResponse(BaseModel):
    """Super admin login response"""
    access_token: str
    token_type: str = "bearer"
    admin: dict


class SuperAdminResponse(BaseModel):
    """Super admin information response"""
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    is_active: bool
    last_login: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class PlatformStatisticsResponse(BaseModel):
    """Platform statistics response"""
    total_tenants: int
    active_tenants: int
    total_users: int
    active_users: int
    active_sessions: int
    total_licenses_purchased: int
    licenses_used: int
    licenses_available: int


class TenantResponse(BaseModel):
    """Tenant information response"""
    id: str
    subdomain: Optional[str]
    custom_domain: Optional[str]
    company_name: str
    contact_email: str
    contact_phone: Optional[str]
    is_active: bool
    subscription_tier: str
    purchased_user_licenses: int
    created_at: str

    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    """Paginated tenant list response"""
    tenants: List[TenantResponse]
    total: int
    skip: int
    limit: int


class TenantDetailsResponse(BaseModel):
    """Detailed tenant information"""
    tenant: TenantResponse
    user_count: int
    active_sessions: int
    licenses_used: int
    licenses_available: int


class CreateTenantRequest(BaseModel):
    """Create tenant request"""
    company_name: str
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    subdomain: Optional[str] = None
    custom_domain: Optional[str] = None
    purchased_user_licenses: int = 10
    # Tenant admin (first user with is_admin=True) so they can log in at /tenant-admin/login
    admin_email: Optional[EmailStr] = None  # default: contact_email
    admin_password: str = ""  # required if creating admin; min 8 chars


class UpdateTenantLicensesRequest(BaseModel):
    """Update tenant licenses request"""
    licenses_count: int


class UpdateTenantActiveRequest(BaseModel):
    """Update tenant active status"""
    is_active: bool


class SendPasswordResetRequest(BaseModel):
    """Send password reset for a tenant user (by email)"""
    email: EmailStr


@router.post("/login", response_model=SuperAdminLoginResponse)
async def super_admin_login(
    login_data: SuperAdminLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Super admin login (no tenant context required)
    """
    try:
        admin = SuperAdminService.authenticate_super_admin(
            login_data.email,
            login_data.password,
            db
        )
    except Exception as e:
        logger.exception("Super admin login error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        ) from e

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Update last login
    admin.last_login = datetime.utcnow()
    db.commit()

    # Create JWT token (no tenant_id for super admin)
    token_data = {
        "admin_id": str(admin.id),
        "email": admin.email,
        "role": "super_admin"
    }
    access_token = create_access_token(data=token_data)

    logger.info(f"Super admin logged in: {admin.email}")

    return SuperAdminLoginResponse(
        access_token=access_token,
        admin={
            "id": str(admin.id),
            "email": admin.email,
            "first_name": admin.first_name,
            "last_name": admin.last_name
        }
    )


@router.get("/me", response_model=SuperAdminResponse)
async def get_current_super_admin_info(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get current super admin information
    """
    admin = get_current_super_admin(request, credentials.credentials, db=db)

    return SuperAdminResponse(
        id=str(admin.id),
        email=admin.email,
        first_name=admin.first_name,
        last_name=admin.last_name,
        is_active=admin.is_active,
        last_login=admin.last_login.isoformat() if admin.last_login else None,
        created_at=admin.created_at.isoformat()
    )


@router.get("/statistics", response_model=PlatformStatisticsResponse)
async def get_platform_statistics(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get platform-wide statistics
    """
    get_current_super_admin(request, credentials.credentials, db=db)

    try:
        stats = SuperAdminService.get_platform_statistics(db)
    except Exception as e:
        logger.exception("Platform statistics error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Statistics failed: {str(e)}"
        ) from e

    return PlatformStatisticsResponse(**stats)


@router.get("/tenants", response_model=TenantListResponse)
async def list_tenants(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List all tenants (super admin only)
    """
    get_current_super_admin(request, credentials.credentials, db=db)

    result = SuperAdminService.list_tenants(
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
        db=db
    )

    tenant_responses = [
        TenantResponse(
            id=str(tenant.id),
            subdomain=tenant.subdomain,
            custom_domain=tenant.custom_domain,
            company_name=tenant.company_name,
            contact_email=tenant.contact_email,
            contact_phone=tenant.contact_phone,
            is_active=tenant.is_active,
            subscription_tier=tenant.subscription_tier,
            purchased_user_licenses=tenant.purchased_user_licenses,
            created_at=tenant.created_at.isoformat()
        )
        for tenant in result["tenants"]
    ]

    return TenantListResponse(
        tenants=tenant_responses,
        total=result["total"],
        skip=result["skip"],
        limit=result["limit"]
    )


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    request: Request,
    body: CreateTenantRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Create a new tenant (super admin only).
    Provide either subdomain or custom_domain (or both).
    """
    get_current_super_admin(request, credentials.credentials, db=db)

    if not body.subdomain and not body.custom_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either subdomain or custom_domain must be provided"
        )

    if body.purchased_user_licenses < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License count cannot be negative"
        )

    if body.admin_password and len(body.admin_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant admin password must be at least 8 characters"
        )

    try:
        tenant = TenantService.create_tenant(
            subdomain=body.subdomain,
            custom_domain=body.custom_domain,
            company_name=body.company_name,
            contact_email=body.contact_email,
            contact_phone=body.contact_phone,
            purchased_licenses=body.purchased_user_licenses,
            db=db
        )

        # Create first user as tenant admin so they can log in at /tenant-admin/login
        admin_email = (body.admin_email or body.contact_email).strip()
        if body.admin_password and admin_email:
            try:
                UserService.create_user(
                    tenant_id=str(tenant.id),
                    email=admin_email,
                    password=body.admin_password,
                    first_name=None,
                    last_name=None,
                    is_admin=True,
                    db=db
                )
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
                )

        return TenantResponse(
            id=str(tenant.id),
            subdomain=tenant.subdomain,
            custom_domain=tenant.custom_domain,
            company_name=tenant.company_name,
            contact_email=tenant.contact_email,
            contact_phone=tenant.contact_phone,
            is_active=tenant.is_active,
            subscription_tier=tenant.subscription_tier,
            purchased_user_licenses=tenant.purchased_user_licenses,
            created_at=tenant.created_at.isoformat()
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/tenants/{tenant_id}/active", response_model=TenantResponse)
async def update_tenant_active(
    request: Request,
    tenant_id: str,
    body: UpdateTenantActiveRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Activate or deactivate a tenant (super admin only).
    """
    get_current_super_admin(request, credentials.credentials, db=db)

    tenant = TenantService.get_tenant_by_id(tenant_id, db)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    tenant.is_active = body.is_active
    db.commit()
    db.refresh(tenant)

    return TenantResponse(
        id=str(tenant.id),
        subdomain=tenant.subdomain,
        custom_domain=tenant.custom_domain,
        company_name=tenant.company_name,
        contact_email=tenant.contact_email,
        contact_phone=tenant.contact_phone,
        is_active=tenant.is_active,
        subscription_tier=tenant.subscription_tier,
        purchased_user_licenses=tenant.purchased_user_licenses,
        created_at=tenant.created_at.isoformat()
    )


@router.get("/tenants/{tenant_id}", response_model=TenantDetailsResponse)
async def get_tenant_details(
    request: Request,
    tenant_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get detailed tenant information
    """
    get_current_super_admin(request, credentials.credentials, db=db)

    try:
        details = SuperAdminService.get_tenant_details(tenant_id, db)
        tenant = details["tenant"]

        return TenantDetailsResponse(
            tenant=TenantResponse(
                id=str(tenant.id),
                subdomain=tenant.subdomain,
                custom_domain=tenant.custom_domain,
                company_name=tenant.company_name,
                contact_email=tenant.contact_email,
                contact_phone=tenant.contact_phone,
                is_active=tenant.is_active,
                subscription_tier=tenant.subscription_tier,
                purchased_user_licenses=tenant.purchased_user_licenses,
                created_at=tenant.created_at.isoformat()
            ),
            user_count=details["user_count"],
            active_sessions=details["active_sessions"],
            licenses_used=details["licenses_used"],
            licenses_available=details["licenses_available"]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/tenants/{tenant_id}/send-password-reset")
async def send_tenant_user_password_reset(
    request: Request,
    tenant_id: str,
    body: SendPasswordResetRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Super Admin: create a password reset link for a user in the given tenant (by email).
    Returns reset_link for dev; in production you would send it by email.
    """
    get_current_super_admin(request, credentials.credentials, db=db)

    tenant = TenantService.get_tenant_by_id(tenant_id, db)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    user = UserService.get_user_by_email(body.email, tenant_id, db)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active user with this email in this tenant"
        )

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
    logger.info(f"Super admin sent password reset for {user.email} (tenant {tenant_id}); link: {reset_link}")
    return {"message": "Password reset link created.", "reset_link": reset_link}


@router.put("/tenants/{tenant_id}/licenses", response_model=TenantResponse)
async def update_tenant_licenses(
    request: Request,
    tenant_id: str,
    licenses_data: UpdateTenantLicensesRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Update tenant's purchased licenses
    """
    get_current_super_admin(request, credentials.credentials, db=db)

    if licenses_data.licenses_count < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="License count cannot be negative"
        )

    try:
        tenant = SuperAdminService.update_tenant_licenses(
            tenant_id,
            licenses_data.licenses_count,
            db
        )

        return TenantResponse(
            id=str(tenant.id),
            subdomain=tenant.subdomain,
            custom_domain=tenant.custom_domain,
            company_name=tenant.company_name,
            contact_email=tenant.contact_email,
            contact_phone=tenant.contact_phone,
            is_active=tenant.is_active,
            subscription_tier=tenant.subscription_tier,
            purchased_user_licenses=tenant.purchased_user_licenses,
            created_at=tenant.created_at.isoformat()
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
