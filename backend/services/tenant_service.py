"""
Tenant Service - Business logic for tenant management
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from database.models import Tenant, User
from database.connection import get_db_context
import logging

logger = logging.getLogger(__name__)


class TenantService:
    """Service for tenant-related operations"""

    @staticmethod
    def get_tenant_by_subdomain(subdomain: str, db: Session) -> Optional[Tenant]:
        """Get tenant by subdomain"""
        return db.query(Tenant).filter(
            Tenant.subdomain == subdomain,
            Tenant.is_active == True
        ).first()

    @staticmethod
    def get_tenant_by_custom_domain(custom_domain: str, db: Session) -> Optional[Tenant]:
        """Get tenant by custom domain"""
        return db.query(Tenant).filter(
            Tenant.custom_domain == custom_domain,
            Tenant.is_active == True
        ).first()

    @staticmethod
    def get_tenant_by_domain(domain: str, db: Session, is_custom: bool = False) -> Optional[Tenant]:
        """Get tenant by domain (subdomain or custom domain)"""
        if is_custom:
            return TenantService.get_tenant_by_custom_domain(domain, db)
        else:
            return TenantService.get_tenant_by_subdomain(domain, db)

    @staticmethod
    def get_tenant_by_id(tenant_id: str, db: Session) -> Optional[Tenant]:
        """Get tenant by ID"""
        return db.query(Tenant).filter(Tenant.id == tenant_id).first()

    @staticmethod
    def get_license_usage(tenant_id: str, db: Session) -> dict:
        """Get license usage for a tenant"""
        tenant = TenantService.get_tenant_by_id(tenant_id, db)
        if not tenant:
            return {
                "purchased_licenses": 0,
                "used_licenses": 0,
                "available_licenses": 0,
                "usage_percentage": 0
            }

        # Count active users that consume a license (exclude tenant admins)
        used_licenses = db.query(func.count(User.id)).filter(
            User.tenant_id == tenant_id,
            User.is_active == True,
            User.is_admin == False
        ).scalar() or 0

        purchased_licenses = tenant.purchased_user_licenses
        available_licenses = max(0, purchased_licenses - used_licenses)
        usage_percentage = (used_licenses / purchased_licenses * 100) if purchased_licenses > 0 else 0

        return {
            "purchased_licenses": purchased_licenses,
            "used_licenses": used_licenses,
            "available_licenses": available_licenses,
            "usage_percentage": round(usage_percentage, 2)
        }

    @staticmethod
    def check_license_availability(tenant_id: str, db: Session) -> bool:
        """Check if tenant has available licenses"""
        usage = TenantService.get_license_usage(tenant_id, db)
        return usage["available_licenses"] > 0

    @staticmethod
    def create_tenant(
        subdomain: Optional[str],
        custom_domain: Optional[str],
        company_name: str,
        contact_email: str,
        contact_phone: Optional[str] = None,
        purchased_licenses: int = 10,
        db: Session = None
    ) -> Tenant:
        """Create a new tenant"""
        if db is None:
            with get_db_context() as db:
                return TenantService.create_tenant(
                    subdomain, custom_domain, company_name, contact_email,
                    contact_phone, purchased_licenses, db
                )

        # Validate that at least one domain is provided
        if not subdomain and not custom_domain:
            raise ValueError("Either subdomain or custom_domain must be provided")

        # Check if subdomain or custom domain already exists
        if subdomain:
            existing = TenantService.get_tenant_by_subdomain(subdomain, db)
            if existing:
                raise ValueError(f"Subdomain '{subdomain}' already exists")

        if custom_domain:
            existing = TenantService.get_tenant_by_custom_domain(custom_domain, db)
            if existing:
                raise ValueError(f"Custom domain '{custom_domain}' already exists")

        tenant = Tenant(
            subdomain=subdomain,
            custom_domain=custom_domain,
            company_name=company_name,
            contact_email=contact_email,
            contact_phone=contact_phone,
            purchased_user_licenses=purchased_licenses
        )

        db.add(tenant)
        db.commit()
        db.refresh(tenant)

        logger.info(f"Created tenant: {tenant.id} ({company_name})")
        return tenant

    @staticmethod
    def update_tenant_branding(
        tenant_id: str,
        logo_url: Optional[str] = None,
        primary_color: Optional[str] = None,
        secondary_color: Optional[str] = None,
        company_name: Optional[str] = None,
        clear_logo: bool = False,
        db: Session = None
    ) -> Tenant:
        """Update tenant branding. Set clear_logo=True to remove logo."""
        if db is None:
            with get_db_context() as db:
                return TenantService.update_tenant_branding(
                    tenant_id, logo_url, primary_color, secondary_color, company_name, clear_logo, db
                )

        tenant = TenantService.get_tenant_by_id(tenant_id, db)
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")

        if clear_logo:
            tenant.logo_url = None
        elif logo_url is not None:
            tenant.logo_url = logo_url
        if primary_color is not None:
            tenant.primary_color = primary_color
        if secondary_color is not None:
            tenant.secondary_color = secondary_color
        if company_name is not None:
            tenant.company_name = company_name

        db.commit()
        db.refresh(tenant)

        logger.info(f"Updated branding for tenant: {tenant_id}")
        return tenant

    @staticmethod
    def add_licenses(tenant_id: str, licenses_count: int, db: Session = None) -> Tenant:
        """Add licenses to tenant"""
        if db is None:
            with get_db_context() as db:
                return TenantService.add_licenses(tenant_id, licenses_count, db)

        tenant = TenantService.get_tenant_by_id(tenant_id, db)
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")

        tenant.purchased_user_licenses += licenses_count
        db.commit()
        db.refresh(tenant)

        logger.info(f"Added {licenses_count} licenses to tenant {tenant_id}")
        return tenant
