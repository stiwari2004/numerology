"""
Tenant Middleware - Extract tenant from domain (subdomain or custom domain)
"""
import os
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from database.connection import SessionLocal
from services.tenant_service import TenantService
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Base domain for subdomains (e.g. yourdomain.com). Set SUBDOMAIN_BASE_DOMAIN in .env.
# If Host is acme.yourdomain.com -> tenant subdomain "acme". Otherwise treated as custom domain.
SUBDOMAIN_BASE_DOMAIN = os.getenv("SUBDOMAIN_BASE_DOMAIN", "numerologyapp.com").strip().lower()

# Subdomain reserved for Super Admin only (no tenant). Set ADMIN_SUBDOMAIN in .env; default "admin".
ADMIN_SUBDOMAIN = os.getenv("ADMIN_SUBDOMAIN", "admin").strip().lower()


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware to extract tenant from domain and add to request state.
    
    Supports:
    - Subdomain: msp1.<SUBDOMAIN_BASE_DOMAIN> -> tenant with subdomain="msp1"
    - Custom domain: any other Host -> tenant with custom_domain=<Host>
    """

    async def dispatch(self, request: Request, call_next):
        # Skip middleware for health check, docs, and super-admin (no tenant required)
        if request.url.path in ["/health", "/docs", "/openapi.json", "/redoc"]:
            return await call_next(request)
        if request.url.path.startswith("/api/v1/super-admin"):
            return await call_next(request)

        # Get host from request (strip port)
        host_header = request.headers.get("host", "")
        host = host_header.split(":")[0].lower() if host_header else ""
        if not host:
            return await call_next(request)

        tenant = None
        base = f".{SUBDOMAIN_BASE_DOMAIN}"

        # Subdomain: host must be something like acme.yourdomain.com
        if host.endswith(base) and host != base.lstrip("."):
            subdomain = host[: -len(base)].strip(".") or host.split(".")[0]
            # Admin subdomain: Super Admin only, no tenant
            if subdomain == ADMIN_SUBDOMAIN:
                request.state.tenant = None
                request.state.tenant_id = None
                return await call_next(request)
            db = SessionLocal()
            try:
                tenant = TenantService.get_tenant_by_subdomain(subdomain, db)
            except Exception as e:
                logger.error(f"Error fetching tenant by subdomain: {e}")
            finally:
                db.close()
        # Dev: *.localhost (e.g. senha.localhost) -> resolve by subdomain
        elif host.endswith(".localhost") and host != "localhost":
            subdomain = host[: -len(".localhost")].strip(".")
            if subdomain:
                db = SessionLocal()
                try:
                    tenant = TenantService.get_tenant_by_subdomain(subdomain, db)
                    if tenant:
                        logger.debug(f"Resolved tenant by *.localhost: {tenant.company_name} for host {host}")
                except Exception as e:
                    logger.debug(f"Tenant by .localhost subdomain: {e}")
                finally:
                    db.close()
        if not tenant:
            # Custom domain: use full hostname
            db = SessionLocal()
            try:
                tenant = TenantService.get_tenant_by_custom_domain(host, db)
            except Exception as e:
                logger.error(f"Error fetching tenant by custom domain: {e}")
            finally:
                db.close()

        # If tenant not found: on localhost/127.0.0.1 use first active tenant for dev
        if not tenant:
            if host in ("localhost", "127.0.0.1"):
                db = SessionLocal()
                try:
                    from database.models import Tenant as TenantModel
                    first = db.query(TenantModel).filter(TenantModel.is_active == True).order_by(TenantModel.created_at.asc()).first()
                    if first:
                        tenant = first
                        logger.info(f"Dev fallback: using tenant {tenant.company_name} ({tenant.id}) for host {host}")
                except Exception as e:
                    logger.debug(f"Dev tenant fallback skipped: {e}")
                finally:
                    db.close()
            if not tenant:
                logger.warning(f"Tenant not found for host: {host}")
                request.state.tenant = None
                request.state.tenant_id = None
            else:
                request.state.tenant = tenant
                request.state.tenant_id = str(tenant.id)
        if tenant:
            request.state.tenant = tenant
            request.state.tenant_id = str(tenant.id)
            logger.debug(f"Tenant resolved: {tenant.id} ({tenant.company_name}) for host: {host}")

        # Continue with request
        response = await call_next(request)
        return response


def get_tenant_from_request(request: Request) -> Optional[dict]:
    """Helper function to get tenant from request state"""
    tenant = getattr(request.state, 'tenant', None)
    if tenant:
        return {
            "id": str(tenant.id),
            "subdomain": tenant.subdomain,
            "custom_domain": tenant.custom_domain,
            "company_name": tenant.company_name,
            "logo_url": tenant.logo_url,
            "primary_color": tenant.primary_color,
            "secondary_color": tenant.secondary_color,
        }
    return None
