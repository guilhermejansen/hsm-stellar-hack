import { jwtDecode } from 'jwt-decode';
import { authAPI, setAccessToken, setSessionToken, getAccessToken, clearTokens } from './api';

/**
 * Authentication utilities for Stellar Custody MVP
 * 
 * Handles:
 * - JWT token management
 * - User session state
 * - Authentication status
 * - Token validation
 */

// ==================== TYPES ====================

export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'CEO' | 'CFO' | 'CTO';
  isGuardian: boolean;
  hsmActivated: boolean;
  level?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  sessionToken: string | null;
  accessToken: string | null;
  requiresTOTP: boolean;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role?: string;
  level?: number;
  type: 'session' | 'access';
  hsmActivated: boolean;
  iat: number;
  exp: number;
}

// ==================== TOKEN MANAGEMENT ====================

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * Get user from JWT token
 */
export function getUserFromToken(token: string): User | null {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.email.split('@')[0], // Fallback name
      role: decoded.role as 'CEO' | 'CFO' | 'CTO' | undefined,
      isGuardian: !!decoded.role,
      hsmActivated: decoded.hsmActivated,
      level: decoded.level,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  return !isTokenExpired(token);
}

/**
 * Get current user from stored token
 */
export function getCurrentUser(): User | null {
  const token = getAccessToken();
  if (!token || isTokenExpired(token)) {
    return null;
  }
  return getUserFromToken(token);
}

/**
 * Check if user has guardian role
 */
export function isGuardian(user?: User | null): boolean {
  return user?.isGuardian || false;
}

/**
 * Check if user has specific guardian role
 */
export function hasGuardianRole(user: User | null, role: 'CEO' | 'CFO' | 'CTO'): boolean {
  return user?.role === role;
}

/**
 * Check if user has minimum guardian level
 */
export function hasMinimumLevel(user: User | null, minLevel: number): boolean {
  return (user?.level || 0) >= minLevel;
}

// ==================== AUTHENTICATION ACTIONS ====================

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<{
  success: boolean;
  requiresTOTP: boolean;
  user?: User;
  error?: string;
}> {
  try {
    const response = await authAPI.login({ email, password });
    
    if (response.success && response.data) {
      // Store session token
      setSessionToken(response.data.sessionToken);
      
      return {
        success: true,
        requiresTOTP: response.data.requiresTOTP,
        user: response.data.user,
      };
    }
    
    return {
      success: false,
      requiresTOTP: false,
      error: response.error?.message || 'Login failed',
    };
  } catch (error: any) {
    return {
      success: false,
      requiresTOTP: false,
      error: error.response?.data?.error?.message || 'Login failed',
    };
  }
}

/**
 * Verify TOTP and get access token
 */
export async function verifyTOTP(totpCode: string): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  try {
    const response = await authAPI.verifyTOTP({ totpCode });
    
    if (response.success && response.data) {
      // Store access token
      setAccessToken(response.data.accessToken);
      
      // Get user from token
      const user = getUserFromToken(response.data.accessToken);
      
      return {
        success: true,
        user,
      };
    }
    
    return {
      success: false,
      error: response.error?.message || 'TOTP verification failed',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error?.message || 'TOTP verification failed',
    };
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    await authAPI.logout();
  } catch (error) {
    // Continue with logout even if API call fails
    console.error('Logout API call failed:', error);
  } finally {
    clearTokens();
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}

/**
 * Refresh authentication state
 */
export function refreshAuthState(): AuthState {
  const accessToken = getAccessToken();
  const user = getCurrentUser();
  
  return {
    isAuthenticated: !!accessToken && !!user && !isTokenExpired(accessToken),
    user,
    sessionToken: null, // Session tokens are temporary
    accessToken,
    requiresTOTP: false, // This would be determined during login flow
  };
}

// ==================== PERMISSION HELPERS ====================

/**
 * Check if user can perform guardian actions
 */
export function canPerformGuardianActions(user: User | null): boolean {
  return isGuardian(user) && user?.hsmActivated === true;
}

/**
 * Check if user can register guardians (admin only)
 */
export function canRegisterGuardians(user: User | null): boolean {
  return hasGuardianRole(user, 'CEO') || hasMinimumLevel(user, 3);
}

/**
 * Check if user can approve transactions
 */
export function canApproveTransactions(user: User | null): boolean {
  return canPerformGuardianActions(user);
}

/**
 * Check if user can rebalance wallets
 */
export function canRebalanceWallets(user: User | null): boolean {
  return canPerformGuardianActions(user);
}

/**
 * Check if user can view monitoring data
 */
export function canViewMonitoring(user: User | null): boolean {
  return isGuardian(user) || hasMinimumLevel(user, 2);
}

/**
 * Get user display name
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Unknown User';
  return user.name || user.email.split('@')[0];
}

/**
 * Get user role display
 */
export function getUserRoleDisplay(user: User | null): string {
  if (!user) return '';
  if (user.role) return user.role;
  return user.isGuardian ? 'Guardian' : 'User';
}