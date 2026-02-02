#!/usr/bin/env python3
"""
Create the first Super Admin.
Run from backend directory: python scripts/create_super_admin.py <email> <password>
"""
import os
import sys

# Ensure backend root is on path and load .env
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)
os.chdir(backend_root)
from dotenv import load_dotenv
load_dotenv()

def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/create_super_admin.py <email> <password>")
        sys.exit(1)
    email = sys.argv[1].strip()
    password = sys.argv[2]

    from database.connection import get_db_context
    from services.super_admin_service import SuperAdminService
    from sqlalchemy.exc import OperationalError

    try:
        with get_db_context() as db:
            admin = SuperAdminService.create_super_admin(email=email, password=password, db=db)
            print(f"Super admin created: {admin.email} (id={admin.id})")
    except OperationalError as e:
        err = str(e).lower()
        if "connection refused" in err or "10061" in err:
            print("")
            print("PostgreSQL is not running or not reachable at localhost:5432.")
            print("Start PostgreSQL first, then run this script again.")
            print("  Windows: Open Services, start 'postgresql-x64-XX'; or run: net start postgresql-x64-16")
            print("  Or start from Start Menu if you installed PostgreSQL with the stack builder.")
            sys.exit(1)
        if "password authentication failed" in err:
            print("")
            print("PostgreSQL rejected the username or password in your .env file.")
            print("  - Check backend/.env: DATABASE_URL must match your real PostgreSQL user and password.")
            print("  - User in the error is the one in the URL (e.g. snehanumerology).")
            print("  - If the password has special characters (@ # % & etc), use URL encoding:")
            print("    @ -> %40   # -> %23   % -> %25   & -> %26")
            print("  - Or reset the DB user password in PostgreSQL to match what you put in .env.")
            sys.exit(1)
        if "not permitted to log in" in err:
            print("")
            print("The PostgreSQL role in your .env exists but is not allowed to log in.")
            print("In pgAdmin 4: open Query Tool and run (replace snehanumerology if different):")
            print("  ALTER ROLE snehanumerology LOGIN;")
            print("Then set a password if needed:")
            print("  ALTER ROLE snehanumerology WITH PASSWORD 'YourPassword';")
            sys.exit(1)
        raise
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
