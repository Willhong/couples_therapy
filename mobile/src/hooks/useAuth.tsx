import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import { TokenStorage } from '@/lib/auth';

/**
 * User data from the backend
 */
export interface User {
  id: number;
  email: string;
  disclaimer_accepted: boolean;
  onboarding_completed: boolean;
  tutorial_completed: boolean;
}

/**
 * Auth context type
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, disclaimerVersion: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * Auth context with default values
 */
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component
 */
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch current user from API
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get<User>('/auth/user/');
      setUser(response.data);
    } catch (error) {
      // If unauthorized, clear user state
      setUser(null);
    }
  }, []);

  /**
   * Check for existing tokens on mount
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const hasTokens = await TokenStorage.hasTokens();
        if (hasTokens) {
          await refreshUser();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [refreshUser]);

  /**
   * Sign up with email/password and disclaimer acceptance
   */
  const signUp = useCallback(async (email: string, password: string, disclaimerVersion: string): Promise<void> => {
    try {
      const response = await api.post('/auth/registration/', {
        email,
        password1: password,
        password2: password,
        disclaimer_accepted: true,
        disclaimer_version: disclaimerVersion,
      });

      const { access, refresh, user: userData } = response.data;

      // Save tokens
      await TokenStorage.setTokens(access, refresh);

      // Set user from response or fetch separately
      if (userData) {
        setUser(userData);
      } else {
        await refreshUser();
      }
    } catch (error) {
      const message = getApiErrorMessage(error);
      throw new Error(message);
    }
  }, [refreshUser]);

  /**
   * Sign in with email/password
   */
  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      // Get tokens
      const tokenResponse = await api.post('/auth/token/', {
        email,
        password,
      });

      const { access, refresh } = tokenResponse.data;

      // Save tokens
      await TokenStorage.setTokens(access, refresh);

      // Fetch user data
      await refreshUser();
    } catch (error) {
      const message = getApiErrorMessage(error);
      throw new Error(message);
    }
  }, [refreshUser]);

  /**
   * Sign out and clear tokens
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      // Try to call logout endpoint (optional, may fail if token expired)
      try {
        await api.post('/auth/logout/');
      } catch {
        // Ignore errors on logout endpoint
      }
    } finally {
      // Always clear local tokens and state
      await TokenStorage.clearTokens();
      setUser(null);
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
