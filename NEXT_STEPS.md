# Next Steps – Start, Test, and What’s Done

## What’s already in place

- **Database**: `numerology_msp` with tables (tenants, users, user_sessions, super_admins, etc.)
- **Super Admin**: Created (your email + password)
- **Backend**: FastAPI, auth, numerology API, super-admin API, user/tenant APIs
- **Frontend**: React app with login pages and dashboards (Super Admin, Tenant Admin, User)

---

## 1. Start backend and frontend

**Option A – One command (from repo root)**

```powershell
cd C:\Users\Admin\Documents\Numerology
.\start-all.ps1
```

**Option B – Two terminals**

**Terminal 1 – Backend**

```powershell
cd C:\Users\Admin\Documents\Numerology\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

**Terminal 2 – Frontend**

```powershell
cd C:\Users\Admin\Documents\Numerology\frontend
npm install
npm run dev
```

- **Backend**: http://localhost:8000 (API docs: http://localhost:8000/docs)  
- **Frontend**: http://localhost:3006  

---

## 2. Test Super Admin (ready now)

1. Open **http://localhost:3006/super-admin/login**
2. Log in with your super admin email and password.
3. You should land on the **Super Admin Dashboard**: platform stats and tenant list.

Super Admin does **not** need a tenant; it works as soon as backend + frontend are running.

---

## 3. Test Tenant Admin and User (one-time dev setup)

User and Tenant Admin logins need a **tenant** that the app can resolve on localhost.

**One-time: create a dev tenant and test users**

From the backend folder (venv activated):

```powershell
cd C:\Users\Admin\Documents\Numerology\backend
.\venv\Scripts\Activate.ps1
python scripts\seed_dev_tenant.py
```

This creates:

- A tenant for **localhost**
- **Tenant Admin**: `tenantadmin@localhost.dev` / `Admin123!`
- **User**: `user@localhost.dev` / `User123!`

Then:

1. **Tenant Admin**  
   - Open http://localhost:3006/tenant-admin/login  
   - Log in with `tenantadmin@localhost.dev` / `Admin123!`  
   - You should see the Tenant Admin dashboard and be able to create users (within license limit).

2. **User**  
   - Open http://localhost:3006/login  
   - Log in with `user@localhost.dev` / `User123!`  
   - You should see the User dashboard (numerology calculator).

---

## 4. Quick test checklist

| What | URL | Credentials |
|------|-----|-------------|
| Super Admin | http://localhost:3006/super-admin/login | Your super admin email / password |
| Tenant Admin | http://localhost:3006/tenant-admin/login | tenantadmin@localhost.dev / Admin123! |
| User (calculator) | http://localhost:3006/login | user@localhost.dev / User123! |
| API docs | http://localhost:8000/docs | — |
| Health | http://localhost:8000/health | — |

---

## 5. Optional: run seed script again

If you need a clean dev tenant again, you can run:

```powershell
python scripts\seed_dev_tenant.py
```

If the tenant or users already exist, the script will say so and skip creating duplicates.

---

## 6. What’s not built yet (later)

- **Super Admin**: UI to create tenants or allocate licenses (API exists; dashboard can be extended).
- **Tenant Admin**: UI to edit branding (API exists).
- **Production**: Real subdomains/custom domains, HTTPS, and proper tenant resolution in production.
- **Billing**: License purchases / payments (e.g. Razorpay) – not implemented.

---

## 7. Summary

1. Start backend and frontend (e.g. `.\start-all.ps1` or two terminals).  
2. Test Super Admin at `/super-admin/login`.  
3. Run `python scripts\seed_dev_tenant.py` once.  
4. Test Tenant Admin at `/tenant-admin/login` and User at `/login` with the seeded credentials.

After that, you can test flows, create users from the Tenant Admin dashboard, and use the numerology calculator as a normal user.
