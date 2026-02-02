#!/usr/bin/env python3
"""
Create a dev tenant and tenant admin user for localhost testing.
Run from backend: python scripts/seed_dev_tenant.py

Creates:
- Tenant with custom_domain='localhost' (so http://localhost:3006 resolves to it)
- One tenant admin user (email: tenantadmin@localhost.dev, password: Admin123!)
- One regular user (email: user@localhost.dev, password: User123!)
"""
import os
import sys

backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)
os.chdir(backend_root)

from dotenv import load_dotenv
load_dotenv()

def main():
    from database.connection import get_db_context
    from services.tenant_service import TenantService
    from services.user_service import UserService

    with get_db_context() as db:
        # Create dev tenant for localhost
        try:
            tenant = TenantService.create_tenant(
                subdomain=None,
                custom_domain="localhost",
                company_name="Dev Tenant",
                contact_email="dev@localhost.dev",
                purchased_licenses=10,
                db=db
            )
            print(f"Tenant created: {tenant.company_name} (id={tenant.id})")
        except ValueError as e:
            if "already exists" in str(e).lower():
                tenant = TenantService.get_tenant_by_custom_domain("localhost", db)
                print(f"Tenant already exists: {tenant.company_name} (id={tenant.id})")
            else:
                raise

        tenant_id = str(tenant.id)

        # Create tenant admin user
        try:
            admin = UserService.create_user(
                tenant_id=tenant_id,
                email="tenantadmin@localhost.dev",
                password="Admin123!",
                first_name="Tenant",
                last_name="Admin",
                is_admin=True,
                db=db
            )
            print(f"Tenant admin created: {admin.email} (id={admin.id})")
        except ValueError as e:
            if "already exists" in str(e).lower():
                print("Tenant admin user already exists: tenantadmin@localhost.dev")
            else:
                raise

        # Create regular user
        try:
            user = UserService.create_user(
                tenant_id=tenant_id,
                email="user@localhost.dev",
                password="User123!",
                first_name="Demo",
                last_name="User",
                is_admin=False,
                db=db
            )
            print(f"User created: {user.email} (id={user.id})")
        except ValueError as e:
            if "already exists" in str(e).lower():
                print("User already exists: user@localhost.dev")
            else:
                raise

    print("")
    print("You can now test on http://localhost:3006:")
    print("  - Tenant Admin: /tenant-admin/login  -> tenantadmin@localhost.dev / Admin123!")
    print("  - User:         /login               -> user@localhost.dev / User123!")

if __name__ == "__main__":
    main()
