/**
 * Tenant Admin Login Page Component
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthApiService } from '@/models/authApi';
import { LogIn, Mail, Lock, AlertCircle, Shield } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface TenantBranding {
  logo_url?: string | null;
  company_name?: string;
}

export function TenantAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const navigate = useNavigate();

  // Resolve logo URL - prepend API base when path is relative
  const resolveLogoUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Fetch tenant branding (logo) on mount
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/tenant/info`);
        setBranding({
          logo_url: res.data.logo_url,
          company_name: res.data.company_name,
        });
      } catch {
        // Ignore errors - branding is optional
      }
    };
    fetchBranding();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await AuthApiService.login({ email, password });
      const user = AuthApiService.getCurrentUser();
      if (user?.is_admin) {
        navigate('/tenant-admin/dashboard');
      } else {
        setError('Access denied. Admin privileges required.');
        AuthApiService.logout();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          {/* Tenant Logo - Fixed 120x120px */}
          {branding?.logo_url ? (
            <div className="mb-4 flex justify-center">
              <div className="w-[120px] h-[120px] flex items-center justify-center">
                <img 
                  src={resolveLogoUrl(branding.logo_url)} 
                  alt={branding.company_name || 'Logo'} 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-4">
              <Shield className="w-6 h-6 text-slate-700" />
            </div>
          )}
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            {branding?.company_name ? `${branding.company_name} Admin` : 'Tenant Admin Login'}
          </h1>
          <p className="text-slate-600 text-sm">
            Sign in to manage your tenant
          </p>
          <Link to="/login" className="inline-block mt-2 text-sm text-slate-600 hover:text-slate-900">
            User login? Sign in here
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="admin@yourcompany.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <Link to="/tenant-admin/forgot-password" className="text-sm text-slate-600 hover:text-slate-900">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2 px-4 rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
