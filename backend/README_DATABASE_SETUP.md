# Database Setup Guide

## Prerequisites
- PostgreSQL installed and running
- Python 3.8+
- `.env` in backend with correct `DATABASE_URL` and `SECRET_KEY`

---

## Step 1: Create the database (pgAdmin 4)

1. Open **pgAdmin 4** and connect to your PostgreSQL server.
2. Right-click **Databases** → **Create** → **Database**.
3. **Database** name: `numerology_msp`.
4. **Owner**: leave default or set to your user (e.g. `snehanumerology`).
5. Click **Save**.

Or run this SQL in pgAdmin’s Query Tool (connected to any database, e.g. `postgres`):

```sql
CREATE DATABASE numerology_msp
  OWNER snehanumerology
  ENCODING 'UTF8';
```

(Change `snehanumerology` if your PostgreSQL user is different.)

---

## Step 2: Create tables (from backend folder)

With the venv activated and `.env` pointing at `numerology_msp`:

```powershell
cd C:\Users\Admin\Documents\Numerology\backend
.\venv\Scripts\Activate.ps1
python -c "from dotenv import load_dotenv; load_dotenv(); from database.connection import init_db; init_db()"
```

This creates all tables (tenants, users, user_sessions, super_admins, etc.) from the SQLAlchemy models.

---

## Step 3: Create the first Super Admin

```powershell
python scripts\create_super_admin.py "your@email.com" "YourPassword"
```

---

## Order summary

| Step | What |
|------|------|
| 1 | Create database `numerology_msp` in pgAdmin (or SQL above). |
| 2 | Run `python -c "from dotenv import load_dotenv; load_dotenv(); from database.connection import init_db; init_db()"` from backend. |
| 3 | Run `python scripts\create_super_admin.py "email" "password"`. |

---

## Environment (.env)

In `backend/.env`:

```env
DATABASE_URL=postgresql://snehanumerology:YOUR_PASSWORD@localhost:5432/numerology_msp
SECRET_KEY=your-secret-key-here
```

If the password contains `@`, `#`, `%`, or `&`, URL-encode it in the URL only:  
`@` → `%40`, `#` → `%23`, `%` → `%25`, `&` → `%26`.

---

## Tables created by init_db()

- `tenants` – MSP organizations
- `users` – End users within each MSP
- `user_sessions` – JWT session tracking
- `tenant_licenses` – License tracking
- `license_purchases` – License purchase history
- `super_admins` – Platform super admins

---

## Verify

```powershell
python -c "from dotenv import load_dotenv; load_dotenv(); from database.connection import SessionLocal; from database.models import Tenant; db = SessionLocal(); print('OK, tables exist'); db.close()"
```

---

## Troubleshooting

### "role ... is not permitted to log in"

The PostgreSQL user in your `.env` exists but has login disabled. In **pgAdmin 4** → Query Tool (connected to any DB), run:

```sql
ALTER ROLE snehanumerology LOGIN;
ALTER ROLE snehanumerology WITH PASSWORD 'S@ndysango1982';
```

(Use your actual role name and password.)

### "password authentication failed"

- Ensure the password in `.env` matches the one set in PostgreSQL for that user.
- If the password contains `@`, `#`, `%`, or `&`, URL-encode it in the `DATABASE_URL` only (e.g. `@` → `%40`).
