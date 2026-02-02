"""
Tenant Configuration API endpoints
"""
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, status, Request, UploadFile, File
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
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2MB
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


@router.post("/logo")
async def upload_tenant_logo(
    request: Request,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Upload tenant logo from file (admin only).
    Accepts PNG, JPG, JPEG, GIF, WebP. Max 2MB.
    """
    get_current_admin_user(get_current_user(request, credentials.credentials, db))
    tenant_id = get_current_tenant_id(request)
    
    # Validate file extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read and validate size
    content = await file.read()
    if len(content) > MAX_LOGO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Max 2MB allowed."
        )
    
    # Save file
    uploads_dir = Path(__file__).resolve().parent.parent.parent / "uploads" / "logos"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{tenant_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = uploads_dir / filename
    with open(filepath, "wb") as f:
        f.write(content)
    
    # Update tenant logo_url - store path for frontend to combine with API base URL
    logo_url = f"/static/logos/{filename}"
    tenant = TenantService.update_tenant_branding(
        tenant_id=tenant_id,
        logo_url=logo_url,
        db=db
    )
    
    return {"logo_url": tenant.logo_url}


@router.delete("/logo")
async def remove_tenant_logo(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Remove tenant logo (admin only)."""
    get_current_admin_user(get_current_user(request, credentials.credentials, db))
    tenant_id = get_current_tenant_id(request)
    
    tenant = TenantService.update_tenant_branding(
        tenant_id=tenant_id,
        clear_logo=True,
        db=db
    )
    
    return {"logo_url": None}


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
