/**
 * User Dashboard Component (shows numerology calculator)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthApiService } from '@/models/authApi';
import { NumerologyPage } from './NumerologyPage';
import { LogOut } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface TenantBranding {
  logo_url?: string | null;
  company_name?: string;
}

export function UserDashboard() {
  const navigate = useNavigate();
  const [branding, setBranding] = useState<TenantBranding | null>(null);

  useEffect(() => {
    if (!AuthApiService.isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

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

  const resolveLogoUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleLogout = async () => {
    await AuthApiService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding?.logo_url && (
                <div className="w-[120px] h-[120px] flex-shrink-0 flex items-center justify-center overflow-hidden rounded">
                  <img
                    src={resolveLogoUrl(branding.logo_url)}
                    alt={branding.company_name || 'Logo'}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <h1 className="text-xl font-semibold text-slate-900">
                {branding?.company_name || 'Numerology Calculator'}
              </h1>
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
      <main>
        <NumerologyPage />
      </main>
    </div>
  );
}
