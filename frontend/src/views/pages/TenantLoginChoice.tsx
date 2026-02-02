/**
 * Tenant subdomain landing: choose User Login or Tenant Admin Login
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Shield, User } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface TenantBranding {
  logo_url?: string | null;
  company_name?: string;
}

export function TenantLoginChoice() {
  const [branding, setBranding] = useState<TenantBranding | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          {/* Tenant Logo - Fixed 120x120px */}
          {branding?.logo_url && (
            <div className="mb-4 flex justify-center">
              <div className="w-[120px] h-[120px] flex items-center justify-center">
                <img 
                  src={resolveLogoUrl(branding.logo_url)} 
                  alt={branding.company_name || 'Logo'} 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            {branding?.company_name || 'Welcome'}
          </h1>
          <p className="text-slate-600 text-sm">
            Choose how you want to sign in
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/login"
            className="flex items-center gap-3 w-full p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <span className="font-medium text-slate-900 block">User Login</span>
              <span className="text-sm text-slate-500">Sign in to use the numerology app</span>
            </div>
            <LogIn className="w-5 h-5 text-slate-400 ml-auto flex-shrink-0" />
          </Link>

          <Link
            to="/tenant-admin/login"
            className="flex items-center gap-3 w-full p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <span className="font-medium text-slate-900 block">Tenant Admin</span>
              <span className="text-sm text-slate-500">Manage users and settings</span>
            </div>
            <LogIn className="w-5 h-5 text-slate-400 ml-auto flex-shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
