'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { 
  User, 
  AuthState, 
  login as authLogin, 
  verifyTOTP as authVerifyTOTP, 
  logout as authLogout,
  refreshAuthState,
  getCurrentUser,
  isAuthenticated as checkIsAuthenticated
} from '@/lib/auth';

/**
 * Authentication Context for Stellar Custody MVP
 * 
 * Provides global authentication state management:
 * - User login/logout
 * - TOTP verification
 * - Session management
 * - Route protection
 * - Guardian permissions
 */

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; requiresTOTP: boolean; error?: string }>;
  verifyTOTP: (totpCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    sessionToken: null,
    accessToken: null,
    requiresTOTP: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const state = refreshAuthState();
        setAuthState(state);
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          sessionToken: null,
          accessToken: null,
          requiresTOTP: false,
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const result = await authLogin(email, password);
      
      if (result.success) {
        setAuthState(prev => ({
          ...prev,
          requiresTOTP: result.requiresTOTP,
          user: result.user || null,
        }));
        
        if (!result.requiresTOTP) {
          // Direct login success (no TOTP required)
          const newState = refreshAuthState();
          setAuthState(newState);
          router.push('/dashboard');
          toast.success('Login successful');
        } else {
          // TOTP verification required
          router.push('/verify-totp');
        }
      }
      
      return {
        success: result.success,
        requiresTOTP: result.requiresTOTP,
        error: result.error,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Login failed';
      toast.error(errorMessage);
      
      return {
        success: false,
        requiresTOTP: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  // TOTP verification function
  const verifyTOTP = async (totpCode: string) => {
    setIsLoading(true);
    
    try {
      const result = await authVerifyTOTP(totpCode);
      
      if (result.success) {
        // Refresh auth state with new access token
        const newState = refreshAuthState();
        setAuthState(newState);
        
        router.push('/dashboard');
        toast.success('Authentication successful');
      }
      
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'TOTP verification failed';
      toast.error(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    try {
      await authLogout();
      
      setAuthState({
        isAuthenticated: false,
        user: null,
        sessionToken: null,
        accessToken: null,
        requiresTOTP: false,
      });
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh auth state
  const refreshAuth = () => {
    try {
      const newState = refreshAuthState();
      setAuthState(newState);
    } catch (error) {
      console.error('Failed to refresh auth state:', error);
    }
  };

  // Auto-refresh auth state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (authState.isAuthenticated) {
        const user = getCurrentUser();
        if (!user || !checkIsAuthenticated()) {
          // Token expired, logout
          logout();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [authState.isAuthenticated]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    verifyTOTP,
    logout,
    refreshAuth,
    isLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to get current user
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

/**
 * Hook to check if user is a guardian
 */
export function useIsGuardian(): boolean {
  const { user } = useAuth();
  return user?.isGuardian || false;
}

/**
 * Hook to check guardian role
 */
export function useGuardianRole(): 'CEO' | 'CFO' | 'CTO' | null {
  const { user } = useAuth();
  return user?.role || null;
}

/**
 * Hook to check if user can perform guardian actions
 */
export function useCanPerformGuardianActions(): boolean {
  const { user } = useAuth();
  return user?.isGuardian === true && user?.hsmActivated === true;
}