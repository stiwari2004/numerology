/**
 * Super Admin Dashboard Component
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthApiService } from '@/models/authApi';
import { 
  Users, 
  Building2, 
  Activity, 
  LogOut, 
  TrendingUp,
  Crown,
  Plus,
  Pencil,
  Power,
  PowerOff,
  X,
  KeyRound
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  active_users: number;
  active_sessions: number;
  total_licenses_purchased: number;
  licenses_used: number;
  licenses_available: number;
}

interface Tenant {
  id: string;
  company_name: string;
  contact_email: string;
  subdomain?: string;
  custom_domain?: string;
  contact_phone?: string;
  is_active: boolean;
  purchased_user_licenses: number;
  created_at: string;
}

interface CreateTenantForm {
  company_name: string;
  contact_email: string;
  contact_phone: string;
  subdomain: string;
  custom_domain: string;
  purchased_user_licenses: number;
  admin_email: string;
  admin_password: string;
  admin_password_confirm: string;
}

const defaultCreateForm: CreateTenantForm = {
  company_name: '',
  contact_email: '',
  contact_phone: '',
  subdomain: '',
  custom_domain: '',
  purchased_user_licenses: 10,
  admin_email: '',
  admin_password: '',
  admin_password_confirm: '',
};

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTenantForm>(defaultCreateForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editLicensesTenant, setEditLicensesTenant] = useState<Tenant | null>(null);
  const [editLicensesValue, setEditLicensesValue] = useState(0);
  const [editLicensesSubmitting, setEditLicensesSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resetPasswordTenant, setResetPasswordTenant] = useState<Tenant | null>(null);
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<{ message: string; reset_link?: string } | null>(null);

  useEffect(() => {
    const token = AuthApiService.getSuperAdminToken();
    if (!token) {
      navigate('/super-admin/login');
      return;
    }

    loadDashboardData();
  }, [navigate]);

  const getAuthHeaders = () => {
    const token = AuthApiService.getSuperAdminToken();
    return { Authorization: `Bearer ${token}` };
  };

  const loadDashboardData = async () => {
    try {
      setError(null);
      const headers = getAuthHeaders();

      const [statsRes, tenantsRes] = await Promise.all([
        axios.get<PlatformStats>(`${API_BASE_URL}/api/v1/super-admin/statistics`, { headers }),
        axios.get<{ tenants: Tenant[]; total: number }>(`${API_BASE_URL}/api/v1/super-admin/tenants`, { headers }),
      ]);
      setStats(statsRes.data);
      setTenants(tenantsRes.data.tenants);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.subdomain && !createForm.custom_domain) {
      setCreateError('Provide either subdomain or custom domain.');
      return;
    }
    if (createForm.purchased_user_licenses < 0) {
      setCreateError('User licenses must be 0 or more.');
      return;
    }
    if (createForm.admin_password.length > 0) {
      if (createForm.admin_password.length < 8) {
        setCreateError('Tenant admin password must be at least 8 characters.');
        return;
      }
      if (createForm.admin_password !== createForm.admin_password_confirm) {
        setCreateError('Passwords do not match.');
        return;
      }
    } else {
      setCreateError('Tenant admin password is required so they can log in at /tenant-admin/login.');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const adminEmail = (createForm.admin_email || createForm.contact_email).trim();
      await axios.post(
        `${API_BASE_URL}/api/v1/super-admin/tenants`,
        {
          company_name: createForm.company_name,
          contact_email: createForm.contact_email,
          contact_phone: createForm.contact_phone || undefined,
          subdomain: createForm.subdomain || undefined,
          custom_domain: createForm.custom_domain || undefined,
          purchased_user_licenses: createForm.purchased_user_licenses,
          admin_email: adminEmail || undefined,
          admin_password: createForm.admin_password,
        },
        { headers: getAuthHeaders() }
      );
      setShowCreateModal(false);
      setCreateForm(defaultCreateForm);
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data?.detail
        ? String(err.response.data.detail)
        : (err instanceof Error ? err.message : 'Failed to create tenant');
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEditLicenses = (tenant: Tenant) => {
    setEditLicensesTenant(tenant);
    setEditLicensesValue(tenant.purchased_user_licenses);
    setActionError(null);
  };

  const handleUpdateLicenses = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLicensesTenant || editLicensesValue < 0) return;
    setEditLicensesSubmitting(true);
    setActionError(null);
    try {
      await axios.put(
        `${API_BASE_URL}/api/v1/super-admin/tenants/${editLicensesTenant.id}/licenses`,
        { licenses_count: editLicensesValue },
        { headers: getAuthHeaders() }
      );
      setEditLicensesTenant(null);
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data?.detail
        ? String(err.response.data.detail)
        : (err instanceof Error ? err.message : 'Failed to update licenses');
      setActionError(msg);
    } finally {
      setEditLicensesSubmitting(false);
    }
  };

  const openResetPassword = (tenant: Tenant) => {
    setResetPasswordTenant(tenant);
    setResetPasswordEmail(tenant.contact_email || '');
    setResetPasswordResult(null);
    setActionError(null);
  };

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordTenant || !resetPasswordEmail.trim()) return;
    setResetPasswordSubmitting(true);
    setActionError(null);
    setResetPasswordResult(null);
    try {
      const res = await axios.post<{ message: string; reset_link?: string }>(
        `${API_BASE_URL}/api/v1/super-admin/tenants/${resetPasswordTenant.id}/send-password-reset`,
        { email: resetPasswordEmail.trim() },
        { headers: getAuthHeaders() }
      );
      setResetPasswordResult(res.data);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data?.detail
        ? String(err.response.data.detail)
        : (err instanceof Error ? err.message : 'Failed to send reset link');
      setActionError(msg);
    } finally {
      setResetPasswordSubmitting(false);
    }
  };

  const handleToggleActive = async (tenant: Tenant) => {
    setActionError(null);
    try {
      await axios.patch(
        `${API_BASE_URL}/api/v1/super-admin/tenants/${tenant.id}/active`,
        { is_active: !tenant.is_active },
        { headers: getAuthHeaders() }
      );
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && err.response?.data?.detail
        ? String(err.response.data.detail)
        : (err instanceof Error ? err.message : 'Failed to update tenant');
      setActionError(msg);
    }
  };

  const handleLogout = async () => {
    await AuthApiService.logout();
    navigate('/super-admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-amber-600" />
              <h1 className="text-xl font-semibold text-slate-900">Super Admin Dashboard</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Total Tenants</h3>
                <Building2 className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{stats.total_tenants}</p>
              <p className="text-xs text-slate-500 mt-1">{stats.active_tenants} active</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Total Users</h3>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{stats.total_users}</p>
              <p className="text-xs text-slate-500 mt-1">{stats.active_users} active</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Active Sessions</h3>
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{stats.active_sessions}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Licenses</h3>
                <TrendingUp className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{stats.total_licenses_purchased}</p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.licenses_used} used, {stats.licenses_available} available
              </p>
            </div>
          </div>
        )}

        {actionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {actionError}
          </div>
        )}

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Tenants</h2>
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                setCreateForm(defaultCreateForm);
                setCreateError(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create tenant
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Licenses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{tenant.company_name}</div>
                      <div className="text-sm text-slate-500">{tenant.contact_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {tenant.custom_domain || tenant.subdomain || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {tenant.purchased_user_licenses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          tenant.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditLicenses(tenant)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit licenses"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openResetPassword(tenant)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Send password reset link"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(tenant)}
                          className={`p-2 rounded-md transition-colors ${
                            tenant.is_active
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={tenant.is_active ? 'Deactivate tenant' : 'Activate tenant'}
                        >
                          {tenant.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create tenant</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTenant} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {createError}
                </div>
              )}
              <details className="text-sm text-slate-600 bg-slate-50 rounded-md p-3 border border-slate-200">
                <summary className="cursor-pointer font-medium text-slate-700">How do subdomains and custom domains work?</summary>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Subdomain</strong> (e.g. <code className="bg-slate-200 px-1 rounded">acme</code>): Users reach the tenant at <code className="bg-slate-200 px-1 rounded">https://acme.yourdomain.com</code>. You set <strong>one</strong> wildcard DNS (<code className="bg-slate-200 px-1 rounded">*.yourdomain.com</code>) to your app; no per-tenant DNS.</li>
                  <li><strong>Custom domain</strong> (e.g. <code className="bg-slate-200 px-1 rounded">app.customer.com</code>): The customer points their DNS to your platform; you add the hostname in your server/hosting so your app receives that Host.</li>
                </ul>
                <p className="mt-2">See <code className="bg-slate-200 px-1 rounded">docs/DOMAIN_SETUP.md</code> for full steps (DNS, HTTPS, and <code className="bg-slate-200 px-1 rounded">SUBDOMAIN_BASE_DOMAIN</code> in .env).</p>
              </details>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company name *</label>
                <input
                  type="text"
                  required
                  value={createForm.company_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, company_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact email *</label>
                <input
                  type="email"
                  required
                  value={createForm.contact_email}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCreateForm((f) => ({ ...f, contact_email: v, admin_email: f.admin_email || v }));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="admin@acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact phone</label>
                <input
                  type="text"
                  value={createForm.contact_phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, contact_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subdomain</label>
                <input
                  type="text"
                  value={createForm.subdomain}
                  onChange={(e) => setCreateForm((f) => ({ ...f, subdomain: e.target.value.trim().toLowerCase() }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="acme (provide subdomain or custom domain)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom domain</label>
                <input
                  type="text"
                  value={createForm.custom_domain}
                  onChange={(e) => setCreateForm((f) => ({ ...f, custom_domain: e.target.value.trim() || '' }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="app.acme.com (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User licenses (max users)</label>
                <input
                  type="number"
                  min={0}
                  value={createForm.purchased_user_licenses}
                  onChange={(e) => setCreateForm((f) => ({ ...f, purchased_user_licenses: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>
              <div className="border-t border-slate-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-slate-800 mb-2">Tenant admin login</h4>
                <p className="text-xs text-slate-500 mb-3">Creates the first admin so they can sign in at /tenant-admin/login on their domain.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Admin email *</label>
                    <input
                      type="email"
                      value={createForm.admin_email}
                      onChange={(e) => setCreateForm((f) => ({ ...f, admin_email: e.target.value }))}
                      onBlur={() => {
                        if (!createForm.admin_email && createForm.contact_email) {
                          setCreateForm((f) => ({ ...f, admin_email: f.contact_email }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      placeholder={createForm.contact_email || 'admin@acme.com'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Admin password * (min 8 characters)</label>
                    <input
                      type="password"
                      value={createForm.admin_password}
                      onChange={(e) => setCreateForm((f) => ({ ...f, admin_password: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password *</label>
                    <input
                      type="password"
                      value={createForm.admin_password_confirm}
                      onChange={(e) => setCreateForm((f) => ({ ...f, admin_password_confirm: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating...' : 'Create tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Licenses Modal */}
      {editLicensesTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit licenses</h3>
              <button
                type="button"
                onClick={() => setEditLicensesTenant(null)}
                className="p-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateLicenses} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                {editLicensesTenant.company_name} — set max number of users this tenant can create.
              </p>
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {actionError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User licenses</label>
                <input
                  type="number"
                  min={0}
                  value={editLicensesValue}
                  onChange={(e) => setEditLicensesValue(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditLicensesTenant(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLicensesSubmitting}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
                >
                  {editLicensesSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Password Reset Modal (Super Admin – tenant user) */}
      {resetPasswordTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Send password reset</h3>
              <button
                type="button"
                onClick={() => { setResetPasswordTenant(null); setResetPasswordResult(null); }}
                className="p-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendPasswordReset} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Tenant: <strong>{resetPasswordTenant.company_name}</strong>. Enter the user’s email to send a reset link.
              </p>
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {actionError}
                </div>
              )}
              {resetPasswordResult && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                  <p className="font-medium">{resetPasswordResult.message}</p>
                  {resetPasswordResult.reset_link && (
                    <p className="mt-2 text-xs break-all">
                      Link (share with user): <a href={resetPasswordResult.reset_link} className="underline">{resetPasswordResult.reset_link}</a>
                    </p>
                  )}
                </div>
              )}
              {!resetPasswordResult && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={resetPasswordEmail}
                      onChange={(e) => setResetPasswordEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      placeholder="user@tenant.com"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetPasswordTenant(null)}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetPasswordSubmitting}
                      className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
                    >
                      {resetPasswordSubmitting ? 'Sending...' : 'Send reset link'}
                    </button>
                  </div>
                </>
              )}
              {resetPasswordResult && (
                <button
                  type="button"
                  onClick={() => { setResetPasswordTenant(null); setResetPasswordResult(null); }}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Close
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
