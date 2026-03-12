import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import type { UserRole } from '../stores/auth-store';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * Auth Guard Component
 * 
 * Protects routes by checking authentication and role requirements.
 * Redirects unauthenticated users to login, or shows fallback for unauthorized roles.
 * 
 * @example
 * ```tsx
 * // Basic auth protection
 * <Route path="/admin" element={<AuthGuard><AdminPage /></AuthGuard>} />
 * 
 * // Role-based protection
 * <Route path="/admin" element={
 *   <AuthGuard requiredRole={['admin', 'super-admin']}>
 *     <AdminPage />
 *   </AuthGuard>
 * } />
 * ```
 */
export function AuthGuard({
  children,
  requiredRole,
  fallback,
  redirectTo = '/login',
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, hasRole, user, logout } = useAuth();
  const location = useLocation();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    // DEBUG: Log detailed information about access denial
    console.error('[AuthGuard] Access Denied Debug:', {
      user: user ? { id: user.id, role: user.role, name: user.name } : null,
      requiredRole,
      isAuthenticated,
    });
    
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-display font-bold text-error-600 mb-4">
            Access Denied
          </h1>
          <p className="text-brand-600 mb-6">
            You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
          </p>
          {/* DEBUG: Show role info to help diagnose */}
          <div className="bg-brand-100 p-3 rounded-lg text-left text-sm mb-4">
            <p><strong>Your role:</strong> {user?.role || 'Not logged in'}</p>
            <p><strong>Required role:</strong> {Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}</p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => logout()}
              className="inline-flex items-center justify-center px-6 py-2 bg-error-100 text-error-700 rounded-lg hover:bg-error-200 transition-colors"
            >
              Logout & Switch Role
            </button>
            <a
              href="/admin/login"
              className="inline-flex items-center justify-center px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface PublicOnlyGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Public Only Guard
 * 
 * Prevents authenticated users from accessing public pages like login.
 * Redirects to home or specified route if already logged in.
 * 
 * @example
 * ```tsx
 * <Route path="/login" element={
 *   <PublicOnlyGuard redirectTo="/admin">
 *     <LoginPage />
 *   </PublicOnlyGuard>
 * } />
 * ```
 */
export function PublicOnlyGuard({
  children,
  redirectTo = '/',
}: PublicOnlyGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  // Redirect authenticated users based on role
  if (isAuthenticated && user) {
    let targetRoute = redirectTo;
    
    // Default redirects based on role
    if (redirectTo === '/') {
      switch (user.role) {
        case 'super-admin':
        case 'admin':
          targetRoute = '/admin';
          break;
        case 'rider':
          targetRoute = '/rider';
          break;
        default:
          targetRoute = '/';
      }
    }

    return <Navigate to={targetRoute} replace />;
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole | UserRole[];
  fallback?: ReactNode;
}

/**
 * Role Guard Component
 * 
 * A simpler role-only guard that assumes the user is already authenticated.
 * Use within protected routes to show/hide content based on roles.
 * 
 * @example
 * ```tsx
 * <RoleGuard allowedRoles={['admin', 'super-admin']}>
 *   <DeleteButton />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
}: RoleGuardProps) {
  const { hasRole } = useAuth();

  if (!hasRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
