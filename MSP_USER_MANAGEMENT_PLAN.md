# MSP User Management System - Implementation Plan

## Overview
Multi-Service Provider (MSP) SaaS model where each MSP gets:
- Unique subdomain/URL (e.g., `msp1.numerologyapp.com`, `msp2.numerologyapp.com`)
- Custom branding (logo, colors, name)
- Isolated user management
- Independent billing/subscription

---

## 1. Architecture Overview

### 1.1 Multi-Tenancy Model
**Option A: Database-per-Tenant (Recommended for MSP model)**
- Each MSP has separate database schema
- Complete data isolation
- Easier compliance (GDPR, data privacy)
- More scalable for MSP model

**Option B: Shared Database with Tenant ID**
- Single database with `tenant_id` in all tables
- Simpler to manage
- Lower cost
- Requires careful data isolation

**Recommendation: Option B (Shared Database)** - More cost-effective for SaaS, easier to scale

### 1.2 Technology Stack
- **Backend**: FastAPI (Python) - Already in use
- **Database**: PostgreSQL (multi-tenant support)
- **Frontend**: React (already in use)
- **Authentication**: JWT tokens with tenant context
- **Subdomain Routing**: Nginx/Reverse Proxy or DNS-based routing

---

## 2. Database Schema Design

### 2.1 Core Tables

#### `tenants` (MSP Organizations)
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain VARCHAR(63) UNIQUE NOT NULL,  -- e.g., "msp1"
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    logo_url TEXT,
    primary_color VARCHAR(7),  -- Hex color for branding
    secondary_color VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50),  -- 'free', 'basic', 'premium', 'enterprise'
    subscription_start_date TIMESTAMP,
    subscription_end_date TIMESTAMP,
    max_users INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
```

#### `users` (End users within each MSP)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,  -- Admin within tenant
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
```

#### `user_sessions` (JWT session tracking)
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_tenant_id ON user_sessions(tenant_id);
```

#### `calculations` (User numerology calculations)
```sql
CREATE TABLE calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Nullable for guest users
    birthdate DATE NOT NULL,
    start_year INTEGER,
    end_year INTEGER,
    calculation_data JSONB NOT NULL,  -- Store full calculation result
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calculations_tenant_id ON calculations(tenant_id);
CREATE INDEX idx_calculations_user_id ON calculations(user_id);
CREATE INDEX idx_calculations_created_at ON calculations(created_at);
```

---

## 3. Authentication & Authorization

### 3.1 Authentication Flow
1. **MSP Registration**: Admin creates MSP account → Gets subdomain
2. **User Registration**: Users register under MSP subdomain
3. **Login**: User logs in → JWT token includes `tenant_id`
4. **Request**: All API requests include `tenant_id` in context

### 3.2 JWT Token Structure
```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "email": "user@example.com",
  "is_admin": false,
  "exp": 1234567890
}
```

### 3.3 Middleware for Tenant Isolation
```python
# backend/app/middleware/tenant_middleware.py
async def tenant_middleware(request: Request, call_next):
    # Extract tenant_id from:
    # 1. Subdomain (msp1.numerologyapp.com)
    # 2. JWT token (for authenticated users)
    # 3. Header (X-Tenant-ID for API calls)
    
    tenant_id = extract_tenant_id(request)
    request.state.tenant_id = tenant_id
    return await call_next(request)
```

---

## 4. Subdomain Routing

### 4.1 DNS Configuration
- Wildcard DNS: `*.numerologyapp.com` → Points to server IP
- Each MSP gets: `{subdomain}.numerologyapp.com`

### 4.2 Frontend Routing
```typescript
// Extract subdomain from window.location
const subdomain = window.location.hostname.split('.')[0];

// Fetch tenant config on app load
const tenantConfig = await fetchTenantConfig(subdomain);

// Apply branding (colors, logo, name)
applyTenantBranding(tenantConfig);
```

### 4.3 Backend Routing
```python
# FastAPI middleware to extract subdomain
@app.middleware("http")
async def subdomain_middleware(request: Request, call_next):
    host = request.headers.get("host", "")
    subdomain = host.split(".")[0]
    
    # Lookup tenant by subdomain
    tenant = await get_tenant_by_subdomain(subdomain)
    request.state.tenant = tenant
    request.state.tenant_id = tenant.id
    
    return await call_next(request)
```

---

## 5. API Endpoints Structure

### 5.1 Tenant Management (Admin Only)
```
POST   /api/v1/admin/tenants              # Create MSP tenant
GET    /api/v1/admin/tenants              # List all tenants
GET    /api/v1/admin/tenants/{id}         # Get tenant details
PUT    /api/v1/admin/tenants/{id}         # Update tenant
DELETE /api/v1/admin/tenants/{id}          # Delete tenant
POST   /api/v1/admin/tenants/{id}/suspend # Suspend tenant
```

### 5.2 User Management (Tenant-scoped)
```
POST   /api/v1/auth/register              # Register user (under current tenant)
POST   /api/v1/auth/login                  # Login (returns JWT with tenant_id)
POST   /api/v1/auth/logout                 # Logout
GET    /api/v1/users                       # List users (tenant-scoped)
GET    /api/v1/users/{id}                  # Get user (tenant-scoped)
PUT    /api/v1/users/{id}                  # Update user (tenant-scoped)
DELETE /api/v1/users/{id}                  # Delete user (tenant-scoped)
```

### 5.3 Numerology Calculations (Tenant-scoped)
```
POST   /api/v1/numerology/calculate        # Calculate (tenant-scoped)
GET    /api/v1/numerology/calculations     # List calculations (tenant-scoped)
GET    /api/v1/numerology/calculations/{id} # Get calculation (tenant-scoped)
DELETE /api/v1/numerology/calculations/{id} # Delete calculation
```

### 5.4 Tenant Configuration
```
GET    /api/v1/tenant/config               # Get tenant branding/config
PUT    /api/v1/tenant/config               # Update tenant branding (admin only)
```

---

## 6. Frontend Multi-Tenancy

### 6.1 Tenant Context Provider
```typescript
// src/contexts/TenantContext.tsx
interface TenantConfig {
  id: string;
  subdomain: string;
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

const TenantContext = createContext<TenantConfig | null>(null);
```

### 6.2 Dynamic Branding
```typescript
// Apply tenant colors to CSS variables
const applyBranding = (config: TenantConfig) => {
  document.documentElement.style.setProperty('--primary-color', config.primaryColor);
  document.documentElement.style.setProperty('--secondary-color', config.secondaryColor);
  
  // Update logo
  const logo = document.getElementById('logo');
  if (logo && config.logoUrl) {
    logo.src = config.logoUrl;
  }
};
```

### 6.3 API Service with Tenant Context
```typescript
// All API calls automatically include tenant context
const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'X-Tenant-ID': getTenantId(), // From subdomain or localStorage
  }
});
```

---

## 7. Subscription & Billing

### 7.1 Subscription Tiers
- **Free**: 5 users, basic features, limited calculations
- **Basic**: 25 users, all features, unlimited calculations
- **Premium**: 100 users, API access, custom branding
- **Enterprise**: Unlimited users, white-label, dedicated support

### 7.2 Billing Integration
- **Stripe** or **Paddle** for payment processing
- Webhook handlers for subscription events
- Automatic tenant suspension on payment failure

### 7.3 Usage Tracking
```sql
CREATE TABLE tenant_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    date DATE NOT NULL,
    calculation_count INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, date)
);
```

---

## 8. Security Considerations

### 8.1 Data Isolation
- **Row-Level Security**: All queries filtered by `tenant_id`
- **Middleware**: Enforce tenant context on all requests
- **Database**: Foreign keys ensure data integrity

### 8.2 API Security
- JWT tokens with tenant validation
- Rate limiting per tenant
- CORS configured per subdomain
- SQL injection prevention (parameterized queries)

### 8.3 Access Control
- Tenant admins can manage users within their tenant
- Super admin (platform admin) can manage all tenants
- Users can only access their own tenant's data

---

## 9. Implementation Phases

### Phase 1: Core Multi-Tenancy (Weeks 1-2)
- [ ] Database schema creation
- [ ] Tenant model and CRUD endpoints
- [ ] Subdomain extraction middleware
- [ ] Basic tenant context in API calls

### Phase 2: User Management (Weeks 3-4)
- [ ] User registration/login (tenant-scoped)
- [ ] JWT authentication with tenant context
- [ ] User management endpoints
- [ ] Frontend authentication flow

### Phase 3: Tenant Branding (Week 5)
- [ ] Tenant config API
- [ ] Frontend dynamic branding
- [ ] Logo upload functionality
- [ ] Color customization

### Phase 4: Data Isolation (Week 6)
- [ ] Calculation storage with tenant_id
- [ ] Tenant-scoped calculation endpoints
- [ ] Frontend tenant context provider
- [ ] Data isolation testing

### Phase 5: Subscription & Billing (Weeks 7-8)
- [ ] Subscription tier management
- [ ] Payment integration (Stripe/Paddle)
- [ ] Usage tracking
- [ ] Subscription webhooks

### Phase 6: Admin Dashboard (Weeks 9-10)
- [ ] Super admin dashboard (manage tenants)
- [ ] Tenant admin dashboard (manage users)
- [ ] Usage analytics
- [ ] Billing management

---

## 10. Migration Strategy

### 10.1 Existing Data
- Create default tenant (e.g., "main" or "default")
- Migrate existing calculations to default tenant
- Assign existing users to default tenant

### 10.2 Zero-Downtime Deployment
- Deploy database migrations first
- Deploy backend with tenant support (backward compatible)
- Deploy frontend with tenant detection
- Gradually migrate users to tenant-based system

---

## 11. Testing Strategy

### 11.1 Unit Tests
- Tenant isolation logic
- Authentication/authorization
- Data filtering by tenant_id

### 11.2 Integration Tests
- Multi-tenant API endpoints
- Subdomain routing
- Cross-tenant data access prevention

### 11.3 E2E Tests
- User registration under tenant
- Login flow with tenant context
- Calculation storage per tenant
- Branding application

---

## 12. Monitoring & Analytics

### 12.1 Metrics to Track
- Active tenants count
- Users per tenant
- Calculations per tenant
- API usage per tenant
- Subscription conversion rates

### 12.2 Logging
- All API requests include tenant_id
- Separate logs per tenant (optional)
- Error tracking with tenant context

---

## 13. Future Enhancements

### 13.1 White-Label Options
- Custom domain support (msp1.com instead of subdomain)
- Full branding customization
- Email templates customization

### 13.2 API Access
- REST API keys per tenant
- Rate limiting per API key
- Webhook support for integrations

### 13.3 Advanced Features
- Multi-language support per tenant
- Custom calculation rules per tenant
- Export/import functionality
- Bulk user management

---

## 14. Cost Considerations

### 14.1 Infrastructure
- Database: Shared PostgreSQL (scales with tenants)
- Hosting: Single server/cluster (multi-tenant)
- CDN: For logo/assets (if needed)

### 14.2 Third-Party Services
- Payment processor: ~2.9% + $0.30 per transaction
- Email service: SendGrid/Mailgun (~$15/month)
- Monitoring: Sentry/DataDog (optional)

---

## 15. Questions to Discuss

1. **Subdomain vs Custom Domain**: Should MSPs get custom domains or only subdomains?
2. **User Limits**: Hard limits or soft limits with overage charges?
3. **Guest Users**: Allow calculations without user accounts?
4. **Data Retention**: How long to keep calculation history?
5. **Export/Backup**: Allow tenants to export their data?
6. **API Access**: Include API access in subscription tiers?
7. **White-Label**: Full white-label or just branding customization?
8. **Multi-Currency**: Support different currencies for billing?

---

## Next Steps

1. **Review this plan** and discuss questions above
2. **Finalize architecture** decisions (database model, routing)
3. **Create detailed technical specifications** for Phase 1
4. **Set up development environment** with tenant support
5. **Begin Phase 1 implementation**

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-27  
**Status**: Draft - Awaiting Review
