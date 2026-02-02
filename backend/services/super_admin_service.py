"""
Super Admin Service - Business logic for super admin management
"""
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
from database.models import SuperAdmin, Tenant, User, UserSession
from database.connection import get_db_context
from passlib.context import CryptContext
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SuperAdminService:
    """Service for super admin-related operations"""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password"""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_super_admin_by_email(email: str, db: Session) -> Optional[SuperAdmin]:
        """Get super admin by email"""
        return db.query(SuperAdmin).filter(SuperAdmin.email == email).first()

    @staticmethod
    def get_super_admin_by_id(admin_id: str, db: Session) -> Optional[SuperAdmin]:
        """Get super admin by ID"""
        return db.query(SuperAdmin).filter(SuperAdmin.id == admin_id).first()

    @staticmethod
    def authenticate_super_admin(email: str, password: str, db: Session) -> Optional[SuperAdmin]:
        """Authenticate super admin"""
        admin = SuperAdminService.get_super_admin_by_email(email, db)
        if not admin:
            return None

        if not admin.is_active:
            return None

        if not SuperAdminService.verify_password(password, admin.password_hash):
            return None

        return admin

    @staticmethod
    def create_super_admin(
        email: str,
        password: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        db: Session = None
    ) -> SuperAdmin:
        """Create a new super admin"""
        if db is None:
            with get_db_context() as db:
                return SuperAdminService.create_super_admin(
                    email, password, first_name, last_name, db
                )

        # Check if admin already exists
        existing = SuperAdminService.get_super_admin_by_email(email, db)
        if existing:
            raise ValueError(f"Super admin with email {email} already exists")

        # Hash password
        password_hash = SuperAdminService.hash_password(password)

        # Create admin
        admin = SuperAdmin(
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        logger.info(f"Created super admin: {admin.id} ({email})")
        return admin

    @staticmethod
    def get_platform_statistics(db: Session = None) -> Dict:
        """Get platform-wide statistics"""
        if db is None:
            with get_db_context() as db:
                return SuperAdminService.get_platform_statistics(db)

        # Total tenants
        total_tenants = db.query(func.count(Tenant.id)).scalar()

        # Active tenants
        active_tenants = db.query(func.count(Tenant.id)).filter(
            Tenant.is_active == True
        ).scalar()

        # Total users
        total_users = db.query(func.count(User.id)).scalar()

        # Active users
        active_users = db.query(func.count(User.id)).filter(
            User.is_active == True
        ).scalar()

        # Active sessions
        from datetime import datetime
        active_sessions = db.query(func.count(UserSession.id)).filter(
            UserSession.expires_at > datetime.utcnow()
        ).scalar()

        # Total licenses purchased (sum can return None or Decimal)
        total_licenses_raw = db.query(func.sum(Tenant.purchased_user_licenses)).scalar()
        total_licenses = int(total_licenses_raw) if total_licenses_raw is not None else 0

        total_tenants = total_tenants or 0
        active_tenants = active_tenants or 0
        total_users = total_users or 0
        active_users = active_users or 0
        active_sessions = active_sessions or 0

        return {
            "total_tenants": total_tenants,
            "active_tenants": active_tenants,
            "total_users": total_users,
            "active_users": active_users,
            "active_sessions": active_sessions,
            "total_licenses_purchased": total_licenses,
            "licenses_used": total_users,
            "licenses_available": max(0, total_licenses - total_users)
        }

    @staticmethod
    def list_tenants(
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        db: Session = None
    ) -> Dict:
        """List all tenants with pagination"""
        if db is None:
            with get_db_context() as db:
                return SuperAdminService.list_tenants(skip, limit, search, is_active, db)

        query = db.query(Tenant)

        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Tenant.company_name.ilike(search_term)) |
                (Tenant.contact_email.ilike(search_term)) |
                (Tenant.subdomain.ilike(search_term)) |
                (Tenant.custom_domain.ilike(search_term))
            )

        if is_active is not None:
            query = query.filter(Tenant.is_active == is_active)

        # Get total count
        total = query.count()

        # Apply pagination
        tenants = query.order_by(Tenant.created_at.desc()).offset(skip).limit(limit).all()

        return {
            "tenants": tenants,
            "total": total,
            "skip": skip,
            "limit": limit
        }

    @staticmethod
    def update_tenant_licenses(
        tenant_id: str,
        licenses_count: int,
        db: Session = None
    ) -> Tenant:
        """Update tenant's purchased licenses"""
        if db is None:
            with get_db_context() as db:
                return SuperAdminService.update_tenant_licenses(tenant_id, licenses_count, db)

        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")

        tenant.purchased_user_licenses = licenses_count
        db.commit()
        db.refresh(tenant)

        logger.info(f"Updated tenant {tenant_id} licenses to {licenses_count}")
        return tenant

    @staticmethod
    def get_tenant_details(tenant_id: str, db: Session = None) -> Dict:
        """Get detailed information about a tenant"""
        if db is None:
            with get_db_context() as db:
                return SuperAdminService.get_tenant_details(tenant_id, db)

        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")

        # Get user count
        user_count = db.query(func.count(User.id)).filter(
            User.tenant_id == tenant_id,
            User.is_active == True
        ).scalar()

        # Get active sessions
        from datetime import datetime
        active_sessions = db.query(func.count(UserSession.id)).filter(
            UserSession.tenant_id == tenant_id,
            UserSession.expires_at > datetime.utcnow()
        ).scalar()

        return {
            "tenant": tenant,
            "user_count": user_count,
            "active_sessions": active_sessions,
            "licenses_used": user_count,
            "licenses_available": max(0, tenant.purchased_user_licenses - user_count)
        }
