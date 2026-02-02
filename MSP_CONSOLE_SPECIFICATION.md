# MSP Console - Specification

## Overview
The MSP Console is a dedicated admin dashboard where MSP administrators can manage their tenant, users, licenses, branding, and billing.

## Access
- **URL**: `{msp-domain}/console` or `{msp-domain}/admin`
- **Authentication**: MSP admin users only (`is_admin = true` within tenant)
- **Role**: Tenant-scoped (MSP admins can only manage their own tenant)

---

## Features

### 1. Dashboard Overview
**Purpose**: Quick overview of tenant status and key metrics

**Display**:
- License Usage: `X / Y licenses used` (with progress bar)
- Active Users: Count of active users
- Total Users: Count of all users (active + inactive)
- Subscription Status: Active/Expired/Suspended
- Subscription Tier: Starter/Professional/Business/Enterprise
- Recent Activity: Last 5 user registrations, license purchases

**Actions**:
- Quick link to purchase more licenses (if near limit)
- Quick link to user management

---

### 2. User Management
**Purpose**: Manage users within the MSP tenant

**Features**:
- **List Users**: 
  - Table view with: Name, Email, Status (Active/Inactive), Role (Admin/User), Last Login, Created Date
  - Search/filter by name, email, status
  - Pagination
  
- **Create User**:
  - Form: First Name, Last Name, Email, Password, Role (Admin/User)
  - License check: Must have available licenses
  - Email validation: Unique within tenant
  
- **Edit User**:
  - Update: Name, Email, Status (Active/Inactive), Role
  - Password reset option
  
- **Delete User**:
  - Confirmation dialog
  - Frees up license slot
  
- **Bulk Actions**:
  - Activate/Deactivate multiple users
  - Export user list (CSV)

---

### 3. License Management
**Purpose**: View and purchase user licenses

**Display**:
- Current License Status:
  - Purchased Licenses: `X`
  - Used Licenses: `Y`
  - Available Licenses: `X - Y`
  - Usage Percentage: `(Y/X) * 100%`
  
- License Purchase History:
  - Table: Date, Licenses Purchased, Amount, Payment Status, Transaction ID
  
**Actions**:
- **Purchase Licenses**:
  - Select number of licenses (10, 25, 50, 100)
  - See pricing
  - Redirect to payment gateway (Razorpay/Stripe)
  - Webhook updates license count after payment

- **View Purchase History**:
  - All past license purchases
  - Download invoices/receipts

---

### 4. Branding Settings
**Purpose**: Customize tenant branding

**Features**:
- **Logo Upload**:
  - Upload logo image (PNG/JPG, max 2MB)
  - Preview current logo
  - Remove logo option
  
- **Color Customization**:
  - Primary Color: Color picker (hex)
  - Secondary Color: Color picker (hex)
  - Preview: See how colors look on UI
  
- **Domain Settings**:
  - Current Domain: Display current subdomain or custom domain
  - Custom Domain Setup: Instructions for DNS configuration
  - Domain Verification: Check if custom domain is properly configured
  
- **Company Information**:
  - Company Name
  - Contact Email
  - Contact Phone

**Save**: Updates apply immediately to tenant's frontend

---

### 5. Billing & Payments
**Purpose**: View billing history and manage payments

**Display**:
- **Current Subscription**:
  - Tier: Starter/Professional/Business/Enterprise
  - Start Date
  - End Date (if applicable)
  - Status: Active/Expired/Suspended
  
- **Payment History**:
  - Table: Date, Description (License Purchase), Amount, Status, Transaction ID
  - Filter by date range
  - Download receipts
  
- **Upcoming Payments**:
  - If subscription-based (future): Show next billing date

**Actions**:
- View invoice details
- Download receipt
- Contact support for billing issues

---

### 6. Settings
**Purpose**: General tenant settings

**Features**:
- **Account Information**:
  - Company Name
  - Contact Email
  - Contact Phone
  - Address (optional)
  
- **Security**:
  - Change admin password
  - Two-factor authentication (future)
  
- **Notifications**:
  - Email notifications for: License limit reached, Payment success/failure, New user registration
  
- **Account Actions**:
  - Suspend account (temporary)
  - Delete account (permanent - requires confirmation)

---

## API Endpoints for MSP Console

### Dashboard
```
GET    /api/v1/console/dashboard          # Get dashboard overview
```

### User Management
```
GET    /api/v1/console/users               # List users (with pagination, search)
POST   /api/v1/console/users               # Create user (checks license)
GET    /api/v1/console/users/{id}          # Get user details
PUT    /api/v1/console/users/{id}          # Update user
DELETE /api/v1/console/users/{id}          # Delete user (frees license)
POST   /api/v1/console/users/{id}/reset-password # Reset user password
POST   /api/v1/console/users/bulk-activate # Bulk activate users
POST   /api/v1/console/users/bulk-deactivate # Bulk deactivate users
```

### License Management
```
GET    /api/v1/console/licenses            # Get license info
POST   /api/v1/console/licenses/purchase   # Initiate license purchase
GET    /api/v1/console/licenses/history    # Get purchase history
GET    /api/v1/console/licenses/invoice/{id} # Get invoice/receipt
```

### Branding
```
GET    /api/v1/console/branding            # Get branding settings
PUT    /api/v1/console/branding             # Update branding (logo, colors, company info)
POST   /api/v1/console/branding/logo        # Upload logo
DELETE /api/v1/console/branding/logo       # Remove logo
GET    /api/v1/console/branding/domain      # Get domain settings
PUT    /api/v1/console/branding/domain      # Update domain (custom domain setup)
```

### Billing
```
GET    /api/v1/console/billing             # Get billing info
GET    /api/v1/console/billing/history      # Get payment history
GET    /api/v1/console/billing/invoice/{id} # Get invoice
```

### Settings
```
GET    /api/v1/console/settings            # Get settings
PUT    /api/v1/console/settings             # Update settings
POST   /api/v1/console/settings/change-password # Change admin password
```

---

## Frontend Structure

### Routes
```
/console                    # Dashboard (redirect)
/console/dashboard          # Dashboard overview
/console/users              # User management
/console/users/new          # Create user
/console/users/:id          # Edit user
/console/licenses           # License management
/console/branding           # Branding settings
/console/billing            # Billing & payments
/console/settings           # Settings
```

### Components
- `ConsoleLayout`: Main layout with sidebar navigation
- `Dashboard`: Overview cards and metrics
- `UserList`: User table with search/filter
- `UserForm`: Create/edit user form
- `LicenseOverview`: License usage display
- `LicensePurchase`: License purchase flow
- `BrandingSettings`: Logo upload, color picker, domain settings
- `BillingHistory`: Payment history table
- `SettingsForm`: General settings form

---

## Security & Permissions

### Access Control
- Only users with `is_admin = true` can access console
- All endpoints check tenant context (from JWT)
- Users can only manage their own tenant's data

### Validation
- License limit check before user creation
- Email uniqueness within tenant
- Domain validation for custom domains
- File size/type validation for logo upload

---

## Implementation Priority

### Phase 1 (Core Console)
1. Dashboard overview
2. User management (list, create, edit, delete)
3. License overview and purchase flow

### Phase 2 (Branding & Settings)
4. Branding settings (logo, colors)
5. Domain configuration
6. General settings

### Phase 3 (Billing)
7. Billing history
8. Invoice/receipt download
9. Payment integration

---

## UI/UX Considerations

### Design
- Clean, professional admin interface
- Consistent with main app design (but distinct)
- Responsive (works on tablet/desktop)
- Clear navigation with sidebar

### User Experience
- Clear feedback on actions (success/error messages)
- Confirmation dialogs for destructive actions
- Loading states for async operations
- Helpful tooltips and instructions

### Accessibility
- Keyboard navigation
- Screen reader support
- High contrast mode
- Clear labels and instructions

---

**Status**: Ready for Implementation  
**Version**: 1.0  
**Last Updated**: 2025-01-27
