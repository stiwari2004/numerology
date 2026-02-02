/**
 * User Dashboard Component (shows numerology calculator)
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthApiService } from '@/models/authApi';
import { NumerologyPage } from './NumerologyPage';
import { LogOut } from 'lucide-react';

export function UserDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!AuthApiService.isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

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
            <h1 className="text-xl font-semibold text-slate-900">Numerology Calculator</h1>
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
