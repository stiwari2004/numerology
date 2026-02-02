# Commands to Run

Run these in order. Use **PowerShell**; your repo root is `C:\Users\Admin\Documents\Numerology`.

---

## 1. Database: ensure `super_admins` table exists

**Option A – Use SQLAlchemy (recommended, creates missing tables only):**

```powershell
cd C:\Users\Admin\Documents\Numerology\backend
.\venv\Scripts\Activate.ps1
python -c "from dotenv import load_dotenv; load_dotenv(); from database.connection import init_db; init_db()"
```

**Option B – Run full schema with psql (only if DB is empty or you’re ok re-running):**

```powershell
psql -U snehanumerology -d numerology_msp -h localhost -f C:\Users\Admin\Documents\Numerology\backend\database\schema.sql
```

*(If you use a different DB user/host, change `-U` and `-h`. If you get trigger errors, your PostgreSQL may be older; say so and we can adjust.)*

---

## 2. Create the first Super Admin

```powershell
cd C:\Users\Admin\Documents\Numerology\backend
.\venv\Scripts\Activate.ps1
python scripts\create_super_admin.py "your@email.com" "YourSecurePassword123"
```

Replace `your@email.com` and `YourSecurePassword123` with the email and password you want for the super admin.

---

## 3. Install backend dependencies (if not already done)

```powershell
cd C:\Users\Admin\Documents\Numerology\backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

---

## 4. Start the backend

```powershell
cd C:\Users\Admin\Documents\Numerology\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

Keep this terminal open. Backend runs at **http://localhost:8000** (API docs at **http://localhost:8000/docs**).

---

## 5. Install frontend dependencies (if not already done)

```powershell
cd C:\Users\Admin\Documents\Numerology\frontend
npm install
```

---

## 6. Start the frontend

```powershell
cd C:\Users\Admin\Documents\Numerology\frontend
npm run dev
```

Keep this terminal open. Frontend runs at **http://localhost:3006**.

---

## 7. One-liner: start both (backend + frontend) in separate windows

From repo root:

```powershell
cd C:\Users\Admin\Documents\Numerology
.\start-all.ps1
```

This starts backend and frontend in new PowerShell windows. Ensure backend and frontend deps are installed (steps 3 and 5) before using this.

---

## Quick reference

| Step | Command |
|------|---------|
| DB init | `cd backend` → activate venv → `python -c "from dotenv import load_dotenv; load_dotenv(); from database.connection import init_db; init_db()"` |
| Create super admin | `cd backend` → activate venv → `python scripts/create_super_admin.py "email" "password"` |
| Backend | `cd backend` → activate venv → `uvicorn main:app --reload --port 8000` |
| Frontend | `cd frontend` → `npm run dev` |
| Both | `.\start-all.ps1` from repo root |

---

## Verify

1. **Backend:** open **http://localhost:8000/docs** and try `GET /health`.
2. **Super admin login:** open **http://localhost:3006/super-admin/login** and sign in with the super admin email/password from step 2.
3. **Tenant / user login:** requires a tenant and user. Use the API (e.g. create tenant and user) or any tenant onboarding flow you’ve built.
