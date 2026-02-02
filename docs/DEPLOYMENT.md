# Deploying Mystic Numerology to Your Linux Server

This guide gets the app live on your server **without Docker**: backend (FastAPI), frontend (React), PostgreSQL, and Nginx with HTTPS.

**Folder layout:** All apps live under an **OPT** folder (e.g. `fitglide_nextjs`, `fitglide_strapi`). Numerology will sit in **OPT/numerology**—either clone the repo there or create `OPT/numerology` and sync/copy the project into it. In this doc, **OPT** is the full path to that folder (e.g. `/home/deploy/OPT` or `/opt/OPT`). The app root is `$OPT/numerology`.

**Your setup:**
- **admin.mysticnumerology.com** → Super Admin (you manage tenants)
- **sneha.mysticnumerology.com** → Tenant “Sneha” (tenant admin + users)
- **backend.mysticnumerology.com** → API only

DNS is already set: A/CNAME records for `admin`, `sneha`, and `backend` (and optionally `*.mysticnumerology.com`) pointing to your server IP.

---

## 1. Server prerequisites

On your Linux server (as root or with sudo):

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Python 3.10+, Node 18+, PostgreSQL, Nginx
sudo apt install -y python3 python3-pip python3-venv nodejs npm postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# Optional: if Node is too old, use NodeSource
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# sudo apt install -y nodejs
```

---

## 2. OPT folder and numerology directory

Use the same user that owns your other OPT apps (or create one). Ensure the **OPT** folder exists, then create the numerology app directory:

```bash
# If OPT doesn't exist yet (adjust path to your choice)
sudo mkdir -p /path/to/OPT
sudo chown YOUR_USER:YOUR_USER /path/to/OPT

cd /path/to/OPT
# Create numerology subfolder and clone into it
mkdir -p numerology
cd numerology
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
# Or clone into a temp dir then move: git clone ... repo && mv repo/* repo/.[!.]* . && rmdir repo
git checkout main   # or your branch
```

Replace `/path/to/OPT` with your real OPT path (e.g. `$HOME/OPT` or `/opt/OPT`), `YOUR_USER` with the user that runs the app, and `YOUR_USERNAME/YOUR_REPO` with your Git repo. The app root is **OPT/numerology** (backend at `OPT/numerology/backend`, frontend at `OPT/numerology/frontend`).

---

## 4. PostgreSQL: database and user

As **postgres** (or root):

```bash
sudo -u postgres psql
```

In `psql`:

```sql
CREATE USER numerology_app WITH PASSWORD 'CHOOSE_A_STRONG_PASSWORD';
CREATE DATABASE numerology_msp OWNER numerology_app;
\c numerology_msp
\i /path/to/OPT/numerology/backend/database/schema.sql
\i /path/to/OPT/numerology/backend/database/grants.sql
\q
```

Replace `/path/to/OPT` with your actual OPT folder path (e.g. `/home/deploy/OPT`). If the path differs, run the SQL files from the correct path. **Important:** If you ran `schema.sql` as user `postgres`, the tables are owned by postgres and the app user has no access. You must run `grants.sql` as postgres (as above) so `numerology_app` can read/write tables. If your app user has a different name, edit `grants.sql` and replace `numerology_app` with that name.

Note the password; you’ll use it in the backend `.env`.

---

## 5. Backend setup (FastAPI)

As the user that owns OPT (e.g. **numerology** or your deploy user):

```bash
cd /path/to/OPT/numerology/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (same directory as `main.py`):

```env
DATABASE_URL=postgresql://numerology_app:CHOOSE_A_STRONG_PASSWORD@localhost:5432/numerology_msp
SECRET_KEY=GENERATE_A_LONG_RANDOM_SECRET_KEY
SUBDOMAIN_BASE_DOMAIN=mysticnumerology.com
ADMIN_SUBDOMAIN=admin
```

- Replace `CHOOSE_A_STRONG_PASSWORD` with the PostgreSQL password.
- Replace `GENERATE_A_LONG_RANDOM_SECRET_KEY` with a long random string (e.g. `openssl rand -hex 32`).
- `SUBDOMAIN_BASE_DOMAIN` and `ADMIN_SUBDOMAIN` make `admin.mysticnumerology.com` Super Admin–only and `sneha.mysticnumerology.com` tenant “sneha”.

Test run:

```bash
source venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8003
```

From another terminal run: `curl http://127.0.0.1:8003/health` (you should see `{"status":"healthy"}`). Then stop the server with Ctrl+C.

**Run the backend continuously (survives SSH disconnect):** Do not rely on a manual uvicorn in a terminal—closing SSH or PowerShell will stop it. Use the systemd service in section 7 so the backend runs in the background, restarts on failure, and starts on boot. For a quick test without systemd you can run: `nohup uvicorn main:app --host 127.0.0.1 --port 8003 &` (then `disown` or leave the session open).

---

## 6. Create Super Admin and tenant “sneha”

With backend stopped or from another terminal (and DB reachable):

```bash
cd /path/to/OPT/numerology/backend
source venv/bin/activate
export $(grep -v '^#' .env | xargs)

# Create Super Admin user (use your real email and password)
python scripts/create_super_admin.py --email YOUR_EMAIL --password YOUR_SAFE_PASSWORD

```

Start the backend (systemd or manually), then open **https://admin.mysticnumerology.com/super-admin/login** and log in with that email/password. In the Super Admin dashboard, **create a new tenant** with subdomain `sneha`, company name (e.g. Sneha), contact email, and admin email/password for https://sneha.mysticnumerology.com/tenant-admin/login. Do not run `seed_dev_tenant.py` on the server (it is for localhost dev only).

---

## 7. Backend systemd service (run continuously)

Use this so the backend keeps running after you close SSH, survives reboots, and restarts on failure:

```bash
sudo nano /etc/systemd/system/numerology-backend.service
```

Replace `/path/to/OPT` with your OPT path and `YOUR_APP_USER` with the user that owns OPT/numerology. Paste:

```ini
[Unit]
Description=Numerology FastAPI Backend
After=network.target postgresql.service

[Service]
Type=simple
User=YOUR_APP_USER
Group=YOUR_APP_USER
WorkingDirectory=/path/to/OPT/numerology/backend
Environment="PATH=/path/to/OPT/numerology/backend/venv/bin"
ExecStart=/path/to/OPT/numerology/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8003
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable numerology-backend
sudo systemctl start numerology-backend
sudo systemctl status numerology-backend
```

---

## 8. Frontend build (React)

As the user that owns OPT:

```bash
cd /path/to/OPT/numerology/frontend
npm ci
npm run build
```

**Option A – API via Nginx proxy (recommended):**  
Keep `location /api` in the frontend Nginx config (below). Then build **without** setting `VITE_API_BASE_URL` so the app uses relative `/api` and Nginx forwards to the backend:

```bash
npm run build
```

**Option B – API on a separate host:**  
If the frontend will call `https://backend.mysticnumerology.com` directly, set the API URL at build time:

```bash
VITE_API_BASE_URL=https://backend.mysticnumerology.com npm run build
```

Built files will be in `frontend/dist/`. Serve this directory with Nginx (next step).

---

## 9. Nginx: reverse proxy and static frontend

**You need this step for the backend and frontend URLs to work.** The systemd service (section 7) only runs the FastAPI app on port 8003 on the server; it does not route a domain to it. Until you add Nginx config for `backend.mysticnumerology.com`, that hostname may still point at another app (e.g. Strapi) or a default site. Add the config below so that:

- **backend.mysticnumerology.com** → Numerology FastAPI (port 8003), not Strapi or anything else  
- **admin.mysticnumerology.com** and **sneha.mysticnumerology.com** → Numerology frontend (and `/api` to port 8003)

Create two separate Nginx config files (one for the backend, one for the frontend). These are for **Numerology only**; leave your existing Strapi/other configs as they are (different `server_name` values).

**Backend** – `backend.mysticnumerology.com` (Numerology API on port 8003):

```bash
sudo nano /etc/nginx/sites-available/numerology-backend
```

```nginx
server {
    listen 80;
    server_name backend.mysticnumerology.com;
    location / {
        proxy_pass http://127.0.0.1:8003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Frontend** – `admin` and `sneha` (and optionally other subdomains):

```bash
sudo nano /etc/nginx/sites-available/numerology-frontend
```

```nginx
server {
    listen 80;
    server_name admin.mysticnumerology.com sneha.mysticnumerology.com mysticnumerology.com;
    root /path/to/OPT/numerology/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api {
        proxy_pass http://127.0.0.1:8003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

If you use a single domain and want to proxy API from the frontend host, you can keep `location /api` as above; then the frontend can use relative `/api` and you don’t need `VITE_API_BASE_URL`. If you prefer the frontend to call `https://backend.mysticnumerology.com` directly, use `VITE_API_BASE_URL=https://backend.mysticnumerology.com` when building and you can remove `location /api` from the frontend server block.

**Quick setup (if you have the repo on the server):** Copy the Nginx configs from the repo, enable them, then test and reload:

```bash
# From repo root (e.g. /opt/numerology)
sudo cp docs/nginx/numerology-backend.conf /etc/nginx/sites-available/
sudo cp docs/nginx/numerology-frontend.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/numerology-backend.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/numerology-frontend.conf /etc/nginx/sites-enabled/
# If frontend root path differs (e.g. /home/opsadmin/OPT/numerology), edit the frontend config first:
# sudo nano /etc/nginx/sites-available/numerology-frontend.conf  → change root /opt/numerology/... to your path
sudo nginx -t
sudo systemctl reload nginx
```

Or create the files by hand (section above). Then enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/numerology-backend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/numerology-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Give Nginx read access to the frontend files:

```bash
sudo chmod -R o+x /path/to/OPT
sudo chmod -R o+r /path/to/OPT/numerology/frontend/dist
```

---

## 10. HTTPS with Let’s Encrypt

```bash
sudo certbot --nginx -d backend.mysticnumerology.com -d admin.mysticnumerology.com -d sneha.mysticnumerology.com
```

Follow prompts. Certbot will adjust your Nginx config for HTTPS. Optional: add `mysticnumerology.com` to the same cert if you serve the app on the apex domain.

Renewal is automatic if `certbot` is installed from the repo; test with:

```bash
sudo certbot renew --dry-run
```

---

## 11. CORS (if frontend and backend on different origins)

If the browser calls `https://backend.mysticnumerology.com` from `https://admin.mysticnumerology.com` or `https://sneha.mysticnumerology.com`, the backend already allows all origins. To restrict in production, in `backend/main.py` set:

```python
allow_origins=[
    "https://admin.mysticnumerology.com",
    "https://sneha.mysticnumerology.com",
    "https://mysticnumerology.com",
]
```

Then restart the backend:

```bash
sudo systemctl restart numerology-backend
```

---

## 12. Summary checklist

| Step | What |
|------|------|
| 1 | Install Python 3, Node, PostgreSQL, Nginx, Certbot |
| 2 | Ensure OPT folder exists; create `OPT/numerology` |
| 3 | Clone repo into `OPT/numerology` |
| 4 | Create DB `numerology_msp`, user, run `schema.sql` and `grants.sql` |
| 5 | Backend: venv, `pip install`, `.env` (DB, SECRET_KEY, SUBDOMAIN_BASE_DOMAIN, ADMIN_SUBDOMAIN) |
| 6 | Run `create_super_admin.py`; create tenant **sneha** via Super Admin UI |
| 7 | Systemd service for uvicorn on 127.0.0.1:8003 |
| 8 | Frontend: `npm ci` and `npm run build` (with `VITE_API_BASE_URL` if you call backend by hostname) |
| 9 | Nginx: backend → :8003, frontend → `OPT/numerology/frontend/dist` for admin/sneha (and `/api` proxy if needed) |
| 10 | Certbot for HTTPS |
| 11 | Optional: tighten CORS and restart backend |

---

## 13. URLs for the client

- **Super Admin:** https://admin.mysticnumerology.com/super-admin/login  
- **Tenant “Sneha” (tenant admin):** https://sneha.mysticnumerology.com/tenant-admin/login  
- **Tenant “Sneha” (end users):** https://sneha.mysticnumerology.com/login  
- **API docs:** https://backend.mysticnumerology.com/docs  

No Docker is required; everything runs with system services and Nginx.
