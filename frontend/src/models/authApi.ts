/**
 * Authentication API Service
 */

import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    is_admin: boolean;
    is_active: boolean;
  };
  tenant?: {
    id: string;
    subdomain?: string;
    custom_domain?: string;
    company_name: string;
    logo_url?: string;
  };
  admin?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export class AuthApiService {
  /**
   * User login (requires tenant context)
   */
  static async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await authClient.post<LoginResponse>(
        '/api/v1/auth/login',
        data
      );
      // Store token
      if (response.data.access_token) {
        localStorage.setItem('auth_token', response.data.access_token);
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        if (response.data.tenant) {
          localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
        }
      }
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(
          error.response?.data?.detail ||
          error.message ||
          'Login failed'
        );
      }
      throw error;
    }
  }

  /**
   * Super admin login (no tenant context)
   */
  static async superAdminLogin(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await authClient.post<LoginResponse>(
        '/api/v1/super-admin/login',
        data
      );
      // Store token
      if (response.data.access_token) {
        localStorage.setItem('super_admin_token', response.data.access_token);
        if (response.data.admin) {
          localStorage.setItem('super_admin', JSON.stringify(response.data.admin));
        }
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.detail ||
          error.message ||
          'Login failed'
        );
      }
      throw error;
    }
  }

  /**
   * User registration
   */
  static async register(data: RegisterRequest): Promise<UserResponse> {
    try {
      const response = await authClient.post<UserResponse>(
        '/api/v1/auth/register',
        data
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(
          error.response?.data?.detail ||
          error.message ||
          'Registration failed'
        );
      }
      throw error;
    }
  }

  /**
   * Logout
   */
  static async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await authClient.post(
          '/api/v1/auth/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
      localStorage.removeItem('super_admin_token');
      localStorage.removeItem('super_admin');
    }
  }

  /**
   * Get current user
   */
  static getCurrentUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Get current tenant
   */
  static getCurrentTenant(): any {
    const tenantStr = localStorage.getItem('tenant');
    return tenantStr ? JSON.parse(tenantStr) : null;
  }

  /**
   * Get current super admin
   */
  static getCurrentSuperAdmin(): any {
    const adminStr = localStorage.getItem('super_admin');
    return adminStr ? JSON.parse(adminStr) : null;
  }

  /**
   * Get auth token
   */
  static getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Get super admin token
   */
  static getSuperAdminToken(): string | null {
    return localStorage.getItem('super_admin_token');
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  /**
   * Check if super admin is authenticated
   */
  static isSuperAdminAuthenticated(): boolean {
    return !!localStorage.getItem('super_admin_token');
  }

  /**
   * Request password reset (tenant context from current origin)
   */
  static async forgotPassword(email: string): Promise<{ message: string; reset_link?: string }> {
    const response = await authClient.post<{ message: string; reset_link?: string }>(
      '/api/v1/auth/forgot-password',
      { email }
    );
    return response.data;
  }

  /**
   * Reset password with token from email link
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await authClient.post<{ message: string }>(
      '/api/v1/auth/reset-password',
      { token, new_password: newPassword }
    );
    return response.data;
  }
}
