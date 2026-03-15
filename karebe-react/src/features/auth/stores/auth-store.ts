import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { demoUsers } from '@/lib/demo-data';

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
  // Track previous role for role switching
  previousRole: UserRole | null;
  
  // Actions
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: AuthUser) => void;
  logout: () => void;
  clearError: () => void;
  
  // Role switching - switch to a different role without full logout
  switchRole: (role: UserRole) => void;
  // Clear session completely including all cached data
  clearSession: () => void;
  
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
      previousRole: null,

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
        previousRole: null,
      }),
      
      clearError: () => set({ error: null }),
      
      // Switch to a different role while maintaining authentication
      // This allows smooth role switching without full logout/login cycle
      switchRole: (role) => {
        const { user } = get();
        if (user) {
          // Store current role before switching
          const previousRole = user.role;
          
          // When switching to rider role, use the rider's actual ID from demo users
          // This is needed because the admin/super-admin ID differs from rider ID
          let updatedUser = { ...user, role };
          
          if (role === 'rider') {
            // Find the rider user and use their ID
            const riderUser = demoUsers.find(u => u.role === 'rider');
            if (riderUser) {
              updatedUser = {
                ...user,
                id: riderUser.id,
                role: 'rider' as UserRole,
                name: riderUser.name,
                phone: riderUser.phone,
              };
              console.log('[AuthStore] Switched to rider, using rider ID:', riderUser.id);
            }
          } else if (role === 'admin' || role === 'super-admin') {
            // When switching to admin, use the admin's ID
            const adminUser = demoUsers.find(u => u.role === 'super-admin');
            if (adminUser) {
              updatedUser = {
                ...user,
                id: adminUser.id,
                role: role,
                name: adminUser.name,
                phone: adminUser.phone,
              };
            }
          }
          
          set({
            user: updatedUser,
            previousRole,
            isLoading: false,
            error: null,
          });
          console.log('[AuthStore] Role switched:', previousRole, '->', role);
        }
      },
      
      // Clear session completely - used when user explicitly logs out
      clearSession: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          previousRole: null,
        });
        // Also clear sessionStorage
        sessionStorage.removeItem('karebe-auth');
      },
      
      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        
        // Define role hierarchy - higher roles include permissions of lower roles
        const roleHierarchy: Record<string, number> = {
          'super-admin': 3,
          'admin': 2,
          'rider': 1,
          'customer': 0,
        };
        
        const userRoleLevel = roleHierarchy[user.role] ?? 0;
        
        if (Array.isArray(role)) {
          // Check if user's role level meets any of the required roles
          return role.some(requiredRole => {
            const requiredLevel = roleHierarchy[requiredRole] ?? 0;
            return userRoleLevel >= requiredLevel;
          });
        }
        
        // Single role check - allow higher roles to access lower role routes
        const requiredLevel = roleHierarchy[role] ?? 0;
        return userRoleLevel >= requiredLevel;
      },
    }),
    {
      name: 'karebe-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        previousRole: state.previousRole,
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
export const usePreviousRole = () => useAuthStore((state) => state.previousRole);
// Export switchRole for direct store access
export const useSwitchRole = () => useAuthStore((state) => state.switchRole);
export const useClearSession = () => useAuthStore((state) => state.clearSession);
