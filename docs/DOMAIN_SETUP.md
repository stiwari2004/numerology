# Domain setup for multi-tenant access

Your app identifies each tenant by **how the user reaches it**: either by **subdomain** (e.g. `acme.yourdomain.com`) or by **custom domain** (e.g. `app.customer.com`). You do **not** point the app “at” each subdomain separately—one deployment serves all tenants; the **Host** header decides which tenant is used.

---

## Three roles: where does each log in?

| Role | Who | Login path | Domain used |
|------|-----|------------|-------------|
| **Super Admin** | You (platform owner) | `/super-admin/login` | **Your platform only.** e.g. `https://mydomain.com/super-admin/login`. No tenant; platform-wide. |
| **Tenant Admin** | Customer's admin (creates users, branding) | `/tenant-admin/login` | **The tenant's domain** (same as their users). Custom domain → `https://app.customer.com/tenant-admin/login`. Subdomain → `https://acme.yourdomain.com/tenant-admin/login`. **Not** mydomain/tenant-admin. |
| **User** | End user of a tenant | `/login` | **The tenant's domain.** Custom → `https://app.customer.com/login`. Subdomain → `https://acme.yourdomain.com/login`. |

So: **Users** and **Tenant Admins** both use the **tenant's** URL (their custom domain or the subdomain you gave them). Only **Super Admin** uses your own domain (`mydomain.com/super-admin/login`). Tenant admin does **not** log in at mydomain/tenant-admin—they log in on their tenant's domain at `/tenant-admin/login`, so the app knows which tenant from the Host.

---

## 1. Subdomain (e.g. `acme.yourdomain.com`)

**Idea:** Every tenant gets a subdomain under **your** main domain. Example: tenant “acme” → `acme.yourdomain.com`.

### What you do

1. **Create the tenant in Super Admin**  
   When creating the tenant, set **Subdomain** to the slug (e.g. `acme`). That value is stored and used to resolve the tenant when someone visits `acme.yourdomain.com`.

2. **DNS (your domain)**  
   Add **one** wildcard record so **all** subdomains point to your app:
   - **A record:** `*.yourdomain.com` → IP of your server, or  
   - **CNAME:** `*.yourdomain.com` → your load balancer / hostname (e.g. `yourapp.azurewebsites.net`).

   You do **not** create a separate DNS record per tenant. One wildcard covers `acme`, `contoso`, etc.

3. **Web server / reverse proxy**  
   Your server (e.g. nginx, IIS, or the host in front of your app) must accept requests for `*.yourdomain.com` and forward them to the **same** app (same backend + frontend). The app reads `Host: acme.yourdomain.com`, extracts `acme`, and looks up the tenant by subdomain.

4. **HTTPS**  
   Use a wildcard certificate for `*.yourdomain.com` (e.g. from Let’s Encrypt or your CA) so all subdomains are served over HTTPS.

### Result

- Tenant “acme” with subdomain `acme` → users open **`https://acme.yourdomain.com`**.
- You only configure DNS and the app **once**; new tenants only need to be created in Super Admin (with their subdomain). No extra DNS or server config per tenant.

---

## 2. Custom domain (e.g. `app.customercompany.com`)

**Idea:** The **tenant/customer** uses their own domain (e.g. `app.customercompany.com`) and points it to **your** platform.

### What you do

1. **Create the tenant in Super Admin**  
   Set **Custom domain** to the full hostname users will use (e.g. `app.customercompany.com`). That value is stored and used when a request arrives with `Host: app.customercompany.com`.

2. **Tell the customer what to do (DNS on their side)**  
   They must point their domain to your platform:
   - **CNAME:** `app.customercompany.com` → your public hostname (e.g. `yourapp.azurewebsites.net` or `cname.yourplatform.com`), or  
   - **A record:** `app.customercompany.com` → your server IP.

3. **Your platform must accept that hostname**  
   Your reverse proxy / load balancer / hosting (e.g. nginx, Azure, AWS, Vercel) must be configured to accept requests for `app.customercompany.com` (add the custom domain in the control panel). Many platforms then handle SSL for that hostname (e.g. Let’s Encrypt).

4. **App config**  
   The app already resolves tenant by `Host`; ensure the **base domain** used for subdomain logic (see below) does **not** match the customer’s domain, so the middleware treats it as a custom domain and looks up by `custom_domain`.

### Result

- Tenant with custom_domain `app.customercompany.com` → users open **`https://app.customercompany.com`**.
- Each custom domain requires the **customer** to set DNS and **you** to accept that hostname (and SSL) on your side.

---

## 3. App configuration (base domain for subdomains)

The backend decides “subdomain vs custom domain” by comparing the request **Host** to a **base domain** (e.g. `yourdomain.com`):

- If `Host` is `something.yourdomain.com` → treat as **subdomain** and use `something` to find the tenant.
- Otherwise → treat as **custom domain** and use the full `Host` to find the tenant.

**Set your base domain in `.env`:**

```env
# Base domain for subdomains (no leading/trailing dots). Example: yourdomain.com
# Tenant "acme" will be reached at https://acme.yourdomain.com
SUBDOMAIN_BASE_DOMAIN=yourdomain.com
```

If not set, it defaults to `numerologyapp.com`. Restart the backend after changing this.

---

## 4. Quick reference

| Approach      | Who sets DNS? | What you configure once        | What you do per tenant          |
|---------------|----------------|---------------------------------|---------------------------------|
| **Subdomain** | You            | Wildcard `*.yourdomain.com` → app; HTTPS for `*.yourdomain.com` | Create tenant with subdomain in Super Admin |
| **Custom**    | Customer       | Platform accepts their hostname + SSL | Create tenant with custom_domain; customer points DNS to you |

You do **not** “point the app” to each subdomain individually—one app instance serves all tenants; the **domain (Host)** in each request determines which tenant is used.
