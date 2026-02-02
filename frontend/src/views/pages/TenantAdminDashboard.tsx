/**
 * Tenant Admin Dashboard Component
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthApiService } from '@/models/authApi';
import { 
  Users, 
  UserPlus, 
  LogOut, 
  Shield,
  X,
  Check,
  KeyRound,
  Pencil,
  Image,
  Upload
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

interface LicenseUsage {
  used_licenses: number;
  available_licenses: number;
  purchased_licenses: number;
  usage_percentage?: number;
}

interface TenantInfo {
  id: string;
  company_name: string;
  purchased_user_licenses: number;
  license_usage?: LicenseUsage;
  logo_url?: string | null;
}

export function TenantAdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_admin: false,
  });
  const [resetPasswordResult, setResetPasswordResult] = useState<{ email: string; message: string; reset_link?: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    is_active: true,
    is_admin: false,
  });
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);

  useEffect(() => {
    const token = AuthApiService.getAuthToken();
    const user = AuthApiService.getCurrentUser();
    
    if (!token || !user) {
      navigate('/tenant-admin/login');
      return;
    }

    if (!user.is_admin) {
      navigate('/login');
      return;
    }

    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      const token = AuthApiService.getAuthToken();
      if (!token) {
        navigate('/tenant-admin/login');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      // Load tenant info (tenant config endpoint)
      const tenantRes = await axios.get(
        `${API_BASE_URL}/api/v1/tenant/config`,
        { headers }
      );
      setTenantInfo({
        id: tenantRes.data.id,
        company_name: tenantRes.data.company_name,
        purchased_user_licenses: tenantRes.data.purchased_user_licenses,
        license_usage: tenantRes.data.license_usage,
        logo_url: tenantRes.data.logo_url,
      });

      // Load users
      const usersRes = await axios.get<{ users: User[]; total: number }>(
        `${API_BASE_URL}/api/v1/users`,
        { headers }
      );
      setUsers(usersRes.data.users);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        AuthApiService.logout();
        navigate('/tenant-admin/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const token = AuthApiService.getAuthToken();
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      await axios.post(
        `${API_BASE_URL}/api/v1/users`,
        createForm,
        { headers }
      );

      setShowCreateModal(false);
      setCreateForm({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        is_admin: false,
      });
      loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const token = AuthApiService.getAuthToken();
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      await axios.put(
        `${API_BASE_URL}/api/v1/users/${userId}`,
        { is_active: !currentStatus },
        { headers }
      );

      loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleSendPasswordReset = async (user: User) => {
    setResetPasswordResult(null);
    setError(null);
    try {
      const res = await AuthApiService.forgotPassword(user.email);
      setResetPasswordResult({
        email: user.email,
        message: res.message,
        reset_link: res.reset_link,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      is_active: user.is_active,
      is_admin: user.is_admin,
    });
    setShowEditModal(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    try {
      const token = AuthApiService.getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${API_BASE_URL}/api/v1/users/${editingUser.id}`,
        editForm,
        { headers }
      );
      setShowEditModal(false);
      setEditingUser(null);
      loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = AuthApiService.getAuthToken();
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      await axios.delete(
        `${API_BASE_URL}/api/v1/users/${userId}`,
        { headers }
      );

      loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleLogout = async () => {
    await AuthApiService.logout();
    navigate('/tenant-admin/login');
  };

  // Resolve logo URL - prepend API base when path is relative
  const resolveLogoUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const openLogoModal = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setShowLogoModal(true);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Use PNG, JPG, GIF or WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File too large. Max 2MB.');
      return;
    }
    setError(null);
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoFile) {
      setError('Please select an image file to upload.');
      return;
    }
    setSavingLogo(true);
    setError(null);
    try {
      const token = AuthApiService.getAuthToken();
      const formData = new FormData();
      formData.append('file', logoFile);
      await axios.post(
        `${API_BASE_URL}/api/v1/tenant/logo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setShowLogoModal(false);
      setLogoFile(null);
      setLogoPreview(null);
      loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setSavingLogo(false);
    }
  };

  // License stats: only non-admin users consume licenses (from backend license_usage)
  const usedLicenses = tenantInfo?.license_usage?.used_licenses ?? 0;
  const availableLicenses = tenantInfo?.license_usage?.available_licenses ?? 0;
  const adminCount = users.filter(u => u.is_admin).length;

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
              <Shield className="w-6 h-6 text-slate-700" />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Tenant Admin Dashboard</h1>
                {tenantInfo && (
                  <p className="text-sm text-slate-600">{tenantInfo.company_name}</p>
                )}
              </div>
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
        {resetPasswordResult && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
            <p className="font-medium">Password reset link created for {resetPasswordResult.email}</p>
            {resetPasswordResult.reset_link && (
              <p className="mt-2 text-sm break-all">
                Share this link with the user: <a href={resetPasswordResult.reset_link} className="underline">{resetPasswordResult.reset_link}</a>
              </p>
            )}
            <button
              type="button"
              onClick={() => setResetPasswordResult(null)}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Statistics - licenses exclude tenant admin(s) */}
        {tenantInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">User Licenses Used</h3>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{usedLicenses}</p>
              <p className="text-xs text-slate-500 mt-1">
                {adminCount > 0 ? `+ ${adminCount} tenant admin(s) (excluded from license count)` : 'Users consuming licenses'}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Licenses Purchased</h3>
                <Shield className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">
                {tenantInfo.license_usage?.purchased_licenses ?? tenantInfo.purchased_user_licenses}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-600">Available Licenses</h3>
                <UserPlus className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-3xl font-semibold text-slate-900">{availableLicenses}</p>
            </div>
          </div>
        )}

        {/* Branding Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Branding</h2>
            <button
              onClick={openLogoModal}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>{tenantInfo?.logo_url ? 'Change Logo' : 'Add Logo'}</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[120px] h-[120px] bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
              {tenantInfo?.logo_url ? (
                <img 
                  src={resolveLogoUrl(tenantInfo.logo_url)} 
                  alt="Company Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Image className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-slate-600">Company Logo</p>
              <p className="text-xs text-slate-400 mt-1">
                {tenantInfo?.logo_url 
                  ? 'Logo will appear on the login page' 
                  : 'No logo set. Add one to display on login page.'}
              </p>
              <p className="text-xs text-slate-400">Fixed display size: 120px × 120px</p>
            </div>
          </div>
        </div>

        {/* Users Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Users</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={availableLicenses === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Role
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
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {user.first_name || user.last_name
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_admin ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Tenant Admin
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit user"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendPasswordReset(user)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Send password reset link"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                          className="text-slate-600 hover:text-slate-900"
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? (
                            <X className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <X className="w-4 h-4" />
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

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit User</h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-slate-600 border-slate-300 rounded focus:ring-slate-500"
                />
                <label htmlFor="edit_is_active" className="text-sm text-slate-700">Active</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_admin"
                  checked={editForm.is_admin}
                  onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                  disabled={AuthApiService.getCurrentUser()?.id === editingUser.id}
                  className="w-4 h-4 text-slate-600 border-slate-300 rounded focus:ring-slate-500 disabled:opacity-50"
                />
                <label htmlFor="edit_is_admin" className="text-sm text-slate-700">
                  Tenant Admin {AuthApiService.getCurrentUser()?.id === editingUser.id && '(you cannot remove your own admin role)'}
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logo Upload Modal */}
      {showLogoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Upload Company Logo</h3>
              <button
                onClick={() => setShowLogoModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveLogo} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Choose image from your computer
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleLogoFileChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-slate-100 file:text-slate-700 file:text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  PNG, JPG, GIF or WebP. Max 2MB. Will display at 120×120px on login page.
                </p>
              </div>
              
              {/* Preview */}
              {logoPreview && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Preview</label>
                  <div className="w-[120px] h-[120px] bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden mx-auto">
                    <img 
                      src={logoPreview} 
                      alt="Logo Preview" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-center text-xs text-slate-500 mt-1">120px × 120px (fixed size)</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLogoModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLogo || !logoFile}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingLogo ? 'Uploading...' : 'Upload Logo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={createForm.is_admin}
                  onChange={(e) => setCreateForm({ ...createForm, is_admin: e.target.checked })}
                  className="w-4 h-4 text-slate-600 border-slate-300 rounded focus:ring-slate-500"
                />
                <label htmlFor="is_admin" className="text-sm text-slate-700">
                  Make this user an admin
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
