import type { UserRole } from '../stores/auth-store';

/**
 * Get the appropriate dashboard route based on user role
 */
export function getDashboardRoute(role: UserRole | undefined): string {
  switch (role) {
    case 'super-admin':
    case 'admin':
      return '/admin';
    case 'rider':
      return '/rider';
    default:
      return '/';
  }
}

/**
 * Check if a role can access the admin dashboard
 */
export function canAccessAdmin(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'super-admin';
}

/**
 * Check if a role can access the rider portal
 */
export function canAccessRider(role: UserRole | undefined): boolean {
  return role === 'rider';
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'super-admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'rider':
      return 'Rider';
    case 'customer':
      return 'Customer';
    default:
      return role;
  }
}

/**
 * Get available role switches for the current user
 */
export function getAvailableRoleSwitches(currentRole: UserRole): { role: UserRole; label: string; route: string }[] {
  const switches: { role: UserRole; label: string; route: string }[] = [];
  
  // Add role switches based on current role
  // Note: This assumes the user has multiple roles in the system
  // In a real app, you'd check what roles the user actually has
  
  // For admin/super-admin users, they can access admin dashboard
  if (currentRole === 'super-admin' || currentRole === 'admin') {
    switches.push({ role: 'admin', label: 'Admin Dashboard', route: '/admin' });
  }
  
  // For rider users (and admins who also have rider access), they can access rider portal
  // In this demo system, admins can switch to rider
  if (currentRole === 'rider' || currentRole === 'admin' || currentRole === 'super-admin') {
    switches.push({ role: 'rider', label: 'Rider Portal', route: '/rider' });
  }
  
  // Everyone can go back to customer view
  switches.push({ role: 'customer', label: 'Customer Catalog', route: '/' });
  
  return switches;
}

/**
 * Smoothly navigate to the appropriate dashboard without full page reload
 * This prevents the "annoying redirects" by using client-side routing
 */
export function navigateToDashboard(role: UserRole | undefined, navigate: (path: string) => void): void {
  const route = getDashboardRoute(role);
  navigate(route);
}