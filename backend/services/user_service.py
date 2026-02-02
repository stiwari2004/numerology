"""
User Service - Business logic for user management
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict
from database.models import User, Tenant
from database.connection import get_db_context
from services.tenant_service import TenantService
from passlib.context import CryptContext
import logging

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    """Service for user-related operations"""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password"""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_user_by_email(email: str, tenant_id: str, db: Session) -> Optional[User]:
        """Get user by email within a tenant"""
        return db.query(User).filter(
            User.email == email,
            User.tenant_id == tenant_id
        ).first()

    @staticmethod
    def get_user_by_id(user_id: str, tenant_id: str, db: Session) -> Optional[User]:
        """Get user by ID within a tenant"""
        return db.query(User).filter(
            User.id == user_id,
            User.tenant_id == tenant_id
        ).first()

    @staticmethod
    def list_users(
        tenant_id: str,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        db: Session = None
    ) -> Dict:
        """List users for a tenant with pagination and search"""
        if db is None:
            with get_db_context() as db:
                return UserService.list_users(tenant_id, skip, limit, search, is_active, db)

        query = db.query(User).filter(User.tenant_id == tenant_id)

        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (User.email.ilike(search_term)) |
                (User.first_name.ilike(search_term)) |
                (User.last_name.ilike(search_term))
            )

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        # Get total count
        total = query.count()

        # Apply pagination
        users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

        return {
            "users": users,
            "total": total,
            "skip": skip,
            "limit": limit
        }

    @staticmethod
    def create_user(
        tenant_id: str,
        email: str,
        password: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        is_admin: bool = False,
        db: Session = None
    ) -> User:
        """Create a new user (checks license availability)"""
        if db is None:
            with get_db_context() as db:
                return UserService.create_user(
                    tenant_id, email, password, first_name, last_name, is_admin, db
                )

        # Check license availability
        if not TenantService.check_license_availability(tenant_id, db):
            raise ValueError("No available licenses. Please purchase more licenses.")

        # Check if user already exists
        existing_user = UserService.get_user_by_email(email, tenant_id, db)
        if existing_user:
            raise ValueError(f"User with email {email} already exists")

        # Hash password
        password_hash = UserService.hash_password(password)

        # Create user
        user = User(
            tenant_id=tenant_id,
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            is_admin=is_admin
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info(f"Created user: {user.id} ({email}) for tenant {tenant_id}")
        return user

    @staticmethod
    def update_user(
        user_id: str,
        tenant_id: str,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_admin: Optional[bool] = None,
        db: Session = None
    ) -> User:
        """Update user"""
        if db is None:
            with get_db_context() as db:
                return UserService.update_user(
                    user_id, tenant_id, email, first_name, last_name, is_active, is_admin, db
                )

        user = UserService.get_user_by_id(user_id, tenant_id, db)
        if not user:
            raise ValueError(f"User {user_id} not found")

        if email is not None:
            # Check if email already exists for another user
            existing = UserService.get_user_by_email(email, tenant_id, db)
            if existing and existing.id != user_id:
                raise ValueError(f"Email {email} already exists")
            user.email = email

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if is_active is not None:
            user.is_active = is_active
        if is_admin is not None:
            user.is_admin = is_admin

        db.commit()
        db.refresh(user)

        logger.info(f"Updated user: {user_id}")
        return user

    @staticmethod
    def delete_user(user_id: str, tenant_id: str, db: Session = None) -> bool:
        """Delete user (frees up license)"""
        if db is None:
            with get_db_context() as db:
                return UserService.delete_user(user_id, tenant_id, db)

        user = UserService.get_user_by_id(user_id, tenant_id, db)
        if not user:
            raise ValueError(f"User {user_id} not found")

        db.delete(user)
        db.commit()

        logger.info(f"Deleted user: {user_id}")
        return True

    @staticmethod
    def authenticate_user(email: str, password: str, tenant_id: str, db: Session) -> Optional[User]:
        """Authenticate user"""
        user = UserService.get_user_by_email(email, tenant_id, db)
        if not user:
            return None

        if not user.is_active:
            return None

        if not UserService.verify_password(password, user.password_hash):
            return None

        return user
