/**
 * Tenant subdomain landing: choose User Login or Tenant Admin Login
 */

import { Link } from 'react-router-dom';
import { LogIn, Shield, User } from 'lucide-react';

export function TenantLoginChoice() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Welcome
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
