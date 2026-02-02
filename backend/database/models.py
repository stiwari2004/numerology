"""
Database models for Numerology MSP Multi-Tenant System
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, DECIMAL, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid
from .connection import Base


class Tenant(Base):
    """MSP Organization (Tenant)"""
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subdomain = Column(String(63), unique=True, nullable=True)
    custom_domain = Column(String(255), unique=True, nullable=True)
    company_name = Column(String(255), nullable=False)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=True)
    logo_url = Column(Text, nullable=True)
    primary_color = Column(String(7), nullable=True)  # Hex color
    secondary_color = Column(String(7), nullable=True)  # Hex color
    is_active = Column(Boolean, default=True)
    subscription_tier = Column(String(50), default='starter')
    subscription_start_date = Column(DateTime, nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)
    purchased_user_licenses = Column(Integer, nullable=False, default=10)
    currency = Column(String(3), default='INR')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="tenant", cascade="all, delete-orphan")
    licenses = relationship("TenantLicense", back_populates="tenant", cascade="all, delete-orphan")
    purchases = relationship("LicensePurchase", back_populates="tenant", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint('subdomain IS NOT NULL OR custom_domain IS NOT NULL', name='check_domain'),
    )

    def __repr__(self):
        return f"<Tenant(id={self.id}, subdomain={self.subdomain}, custom_domain={self.custom_domain}, company_name={self.company_name})>"


class User(Base):
    """End user within an MSP tenant"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        {'extend_existing': True},
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, tenant_id={self.tenant_id}, is_admin={self.is_admin})>"


class UserSession(Base):
    """JWT session tracking"""
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="sessions")
    tenant = relationship("Tenant", back_populates="sessions")

    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"


class PasswordResetToken(Base):
    """Password reset token (for users and tenant admins)"""
    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="password_reset_tokens")

    def __repr__(self):
        return f"<PasswordResetToken(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"


class TenantLicense(Base):
    """License tracking for tenants"""
    __tablename__ = "tenant_licenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    licenses_purchased = Column(Integer, nullable=False)
    licenses_used = Column(Integer, default=0)
    purchase_date = Column(DateTime, server_default=func.now())
    purchase_amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='INR')
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="licenses")

    def __repr__(self):
        return f"<TenantLicense(id={self.id}, tenant_id={self.tenant_id}, licenses_purchased={self.licenses_purchased})>"


class LicensePurchase(Base):
    """License purchase history"""
    __tablename__ = "license_purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    licenses_count = Column(Integer, nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='INR')
    payment_id = Column(String(255), nullable=True)
    payment_status = Column(String(50), default='pending')  # pending, completed, failed
    payment_gateway = Column(String(50), nullable=True)  # razorpay, stripe
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="purchases")

    def __repr__(self):
        return f"<LicensePurchase(id={self.id}, tenant_id={self.tenant_id}, licenses_count={self.licenses_count}, status={self.payment_status})>"


class SuperAdmin(Base):
    """Super Admin (Platform Owner)"""
    __tablename__ = "super_admins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SuperAdmin(id={self.id}, email={self.email})>"
