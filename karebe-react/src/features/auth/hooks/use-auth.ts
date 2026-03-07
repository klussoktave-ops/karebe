import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useAuthStore, type AuthUser, type UserRole } from '../stores/auth-store';
import { login, customerLogin, type LoginCredentials } from '../api/login';
import { logout, validateSession } from '../api/logout';

interface UseAuthReturn {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  customerLogin: (phone: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

/**
 * Combined authentication hook
 * Integrates Zustand store with TanStack Query mutations
 */
export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();
  
  // Use selector pattern to get stable references to store functions
  const store = useAuthStore();
  const setLoading = useAuthStore((state) => state.setLoading);
  const setErrorStore = useAuthStore((state) => state.setError);
  const loginStore = useAuthStore((state) => state.login);
  const logoutStore = useAuthStore((state) => state.logout);

  // Admin/Staff login mutation
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      console.log('[useAuth] Login success:', data);
      if (data.success && data.user) {
        loginStore(data.user);
        // Invalidate any auth-related queries
        queryClient.invalidateQueries({ queryKey: ['auth'] });
      } else {
        setErrorStore(data.message || 'Login failed');
      }
    },
    onError: (error) => {
      setErrorStore(error instanceof Error ? error.message : 'Login failed');
    },
  });

  // Customer login mutation
  const customerLoginMutation = useMutation({
    mutationFn: customerLogin,
    onSuccess: (data) => {
      if (data.success && data.user) {
        loginStore(data.user);
        queryClient.invalidateQueries({ queryKey: ['auth'] });
      } else {
        setErrorStore(data.message || 'Login failed');
      }
    },
    onError: (error) => {
      setErrorStore(error instanceof Error ? error.message : 'Login failed');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      logoutStore();
      // Clear all queries on logout
      queryClient.clear();
    },
  });

  // Session validation query
  const { isLoading: isValidating } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: validateSession,
    enabled: store.isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update loading state based on mutations - FIXED: use stable setLoading reference
  useEffect(() => {
    setLoading(
      loginMutation.isPending || 
      customerLoginMutation.isPending || 
      logoutMutation.isPending ||
      isValidating
    );
  }, [
    loginMutation.isPending,
    customerLoginMutation.isPending,
    logoutMutation.isPending,
    isValidating,
    setLoading, // Stable reference via selector
  ]);

  const handleLogin = useCallback(
    async (credentials: LoginCredentials) => {
      setErrorStore(null);
      await loginMutation.mutateAsync(credentials);
    },
    [loginMutation, setErrorStore]
  );

  const handleCustomerLogin = useCallback(
    async (phone: string) => {
      setErrorStore(null);
      await customerLoginMutation.mutateAsync(phone);
    },
    [customerLoginMutation, setErrorStore]
  );

  const handleLogout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login: handleLogin,
    customerLogin: handleCustomerLogin,
    logout: handleLogout,
    clearError: store.clearError,
    hasRole: store.hasRole,
  };
}

/**
 * Hook to protect routes based on authentication
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const { isAuthenticated, isLoading, user } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    user,
    redirectTo,
  };
}

/**
 * Hook to check if user has specific role(s)
 */
export function useRoleCheck(role: UserRole | UserRole[]) {
  const { hasRole, isAuthenticated } = useAuth();
  
  return {
    hasAccess: isAuthenticated && hasRole(role),
    isAuthenticated,
  };
}
