"""
Tenant Configuration API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session
from typing import Optional
from database.connection import get_db
from services.tenant_service import TenantService
from utils.dependencies import get_current_tenant_id, get_current_admin_user, get_current_user
from middleware.tenant_middleware import get_tenant_from_request
import logging

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


# Request/Response Models
class TenantConfigResponse(BaseModel):
    """Tenant configuration response"""
    id: str
    subdomain: Optional[str]
    custom_domain: Optional[str]
    company_name: str
    contact_email: str
    contact_phone: Optional[str]
    logo_url: Optional[str]
    primary_color: Optional[str]
    secondary_color: Optional[str]
    purchased_user_licenses: int
    license_usage: dict


class TenantBrandingUpdateRequest(BaseModel):
    """Update tenant branding request"""
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    company_name: Optional[str] = None


@router.get("/config", response_model=TenantConfigResponse)
async def get_tenant_config(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get tenant configuration (authenticated users)
    """
    # Verify user is authenticated
    get_current_user(request, credentials=credentials.credentials, db=db)
    
    tenant_id = get_current_tenant_id(request)
    tenant = TenantService.get_tenant_by_id(tenant_id, db)
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Get license usage
    license_usage = TenantService.get_license_usage(tenant_id, db)
    
    return TenantConfigResponse(
        id=str(tenant.id),
        subdomain=tenant.subdomain,
        custom_domain=tenant.custom_domain,
        company_name=tenant.company_name,
        contact_email=tenant.contact_email,
        contact_phone=tenant.contact_phone,
        logo_url=tenant.logo_url,
        primary_color=tenant.primary_color,
        secondary_color=tenant.secondary_color,
        purchased_user_licenses=tenant.purchased_user_licenses,
        license_usage=license_usage
    )


@router.put("/config", response_model=TenantConfigResponse)
async def update_tenant_branding(
    request: Request,
    branding_data: TenantBrandingUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Update tenant branding (admin only)
    """
    # Verify admin access
    get_current_admin_user(get_current_user(request, credentials.credentials, db))
    
    tenant_id = get_current_tenant_id(request)
    
    try:
        tenant = TenantService.update_tenant_branding(
            tenant_id=tenant_id,
            logo_url=branding_data.logo_url,
            primary_color=branding_data.primary_color,
            secondary_color=branding_data.secondary_color,
            company_name=branding_data.company_name,
            db=db
        )
        
        logger.info(f"Tenant branding updated: {tenant_id}")
        
        # Get license usage
        license_usage = TenantService.get_license_usage(tenant_id, db)
        
        return TenantConfigResponse(
            id=str(tenant.id),
            subdomain=tenant.subdomain,
            custom_domain=tenant.custom_domain,
            company_name=tenant.company_name,
            contact_email=tenant.contact_email,
            contact_phone=tenant.contact_phone,
            logo_url=tenant.logo_url,
            primary_color=tenant.primary_color,
            secondary_color=tenant.secondary_color,
            purchased_user_licenses=tenant.purchased_user_licenses,
            license_usage=license_usage
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/info")
async def get_tenant_info(
    request: Request
):
    """
    Get tenant info from domain (public endpoint, no auth required)
    Used by frontend to get tenant branding before login
    """
    tenant_info = get_tenant_from_request(request)
    
    if not tenant_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return tenant_info
