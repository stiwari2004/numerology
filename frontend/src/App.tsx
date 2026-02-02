/**
 * Main App Component with Routing
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/views/pages/LoginPage';
import { TenantAdminLoginPage } from '@/views/pages/TenantAdminLoginPage';
import { SuperAdminLoginPage } from '@/views/pages/SuperAdminLoginPage';
import { ForgotPasswordPage } from '@/views/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/views/pages/ResetPasswordPage';
import { UserDashboard } from '@/views/pages/UserDashboard';
import { TenantAdminDashboard } from '@/views/pages/TenantAdminDashboard';
import { SuperAdminDashboard } from '@/views/pages/SuperAdminDashboard';
import { ProtectedRoute } from '@/views/components/ProtectedRoute';
import './index.css';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/tenant-admin/login" element={<TenantAdminLoginPage />} />
        <Route path="/tenant-admin/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant-admin/dashboard"
          element={
            <ProtectedRoute requireAdmin={true}>
              <TenantAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/dashboard"
          element={
            <ProtectedRoute requireSuperAdmin={true}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
