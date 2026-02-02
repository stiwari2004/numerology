/**
 * Protected Route Component
 */

import { Navigate } from 'react-router-dom';
import { AuthApiService } from '@/models/authApi';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireSuperAdmin = false 
}: ProtectedRouteProps) {
  if (requireSuperAdmin) {
    if (!AuthApiService.isSuperAdminAuthenticated()) {
      return <Navigate to="/super-admin/login" replace />;
    }
    return <>{children}</>;
  }

  if (!AuthApiService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin) {
    const user = AuthApiService.getCurrentUser();
    if (!user?.is_admin) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
