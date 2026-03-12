import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface AuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireRider?: boolean;
}

/**
 * AuthGuard Component
 * Protects routes based on authentication status and user role
 */
export function AuthGuard({ children, requireAdmin, requireRider }: AuthGuardProps) {
  // Check if user is authenticated (simplified - would check actual auth state)
  const isAuthenticated = localStorage.getItem('karebe_session') !== null;
  const userRole = localStorage.getItem('karebe_role') || 'customer';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (requireRider && userRole !== 'rider') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}