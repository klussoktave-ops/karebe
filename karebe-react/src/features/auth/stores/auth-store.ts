import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'customer' | 'admin' | 'super-admin' | 'rider';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  branchId?: string;
  avatar?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: AuthUser) => void;
  logout: () => void;
  clearError: () => void;
  
  // Computed
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      login: (user) => set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }),
      
      logout: () => set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }),
      
      clearError: () => set({ error: null }),
      
      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        
        if (Array.isArray(role)) {
          return role.includes(user.role);
        }
        return user.role === role;
      },
    }),
    {
      name: 'karebe-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Selector hooks for performance
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useHasRole = (role: UserRole | UserRole[]) => useAuthStore((state) => state.hasRole(role));
