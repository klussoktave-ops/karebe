import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wine,
  Building2,
  Shield,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

/**
 * Navigation Item Type
 */
export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  children?: Omit<NavItem, 'children'>[];
}

/**
 * Sidebar Props
 */
export interface SidebarProps {
  /** Whether the sidebar is collapsed */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Additional navigation items */
  navItems?: NavItem[];
  /** User display info */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
  /** Callback for logout */
  onLogout?: () => void;
  /** Current app version */
  version?: string;
}

/**
 * Default navigation items for admin sidebar
 */
const defaultNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Products', href: '/admin/products', icon: <Package className="h-5 w-5" /> },
  { label: 'Branches', href: '/admin/branches', icon: <Building2 className="h-5 w-5" /> },
  { label: 'Riders', href: '/admin/riders', icon: <Truck className="h-5 w-5" /> },
  { label: 'Admins', href: '/admin/admins', icon: <Shield className="h-5 w-5" /> },
  { label: 'Orders', href: '/admin/orders', icon: <ShoppingCart className="h-5 w-5" /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
  { label: 'Pricing', href: '/admin/pricing', icon: <DollarSign className="h-5 w-5" /> },
];

/**
 * Sidebar Component
 *
 * Admin sidebar navigation with collapsible functionality.
 *
 * @example
 * ```tsx
 * <Sidebar
 *   user={{ name: 'Admin', role: 'Super Admin' }}
 *   onLogout={() => handleLogout()}
 * />
 * ```
 */
export function Sidebar({
  collapsed: controlledCollapsed,
  onCollapsedChange,
  navItems = defaultNavItems,
  user,
  onLogout,
  version,
}: SidebarProps) {
  const location = useLocation();
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = React.useState(false);

  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : uncontrolledCollapsed;

  const handleToggle = () => {
    const newValue = !collapsed;
    if (!isControlled) {
      setUncontrolledCollapsed(newValue);
    }
    onCollapsedChange?.(newValue);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-brand-200',
        'flex flex-col transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-brand-100">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center w-full')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Wine className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="font-display text-lg font-bold text-brand-900">
              Karebe
            </span>
          )}
        </div>
        <button
          onClick={handleToggle}
          className={cn(
            'p-1.5 rounded-lg text-brand-400 hover:text-brand-600 hover:bg-brand-100 transition-colors',
            collapsed && 'hidden'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href ||
              location.pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    'hover:bg-brand-50 hover:text-brand-900',
                    isActive
                      ? 'bg-brand-50 text-brand-900'
                      : 'text-brand-600',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={cn(
                    'flex-shrink-0',
                    isActive ? 'text-brand-600' : 'text-brand-400'
                  )}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-semibold text-gold-700">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-brand-100 p-4">
        {user && (
          <>
            <div className={cn(
              'flex items-center gap-3 mb-4',
              collapsed && 'justify-center'
            )}>
              <div className="h-9 w-9 rounded-full bg-brand-200 flex items-center justify-center text-brand-700 font-medium text-sm">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-900 truncate">
                    {user.name}
                  </p>
                  {user.role && (
                    <p className="text-xs text-brand-500 truncate">{user.role}</p>
                  )}
                </div>
              )}
            </div>
            {!collapsed && <Separator className="mb-4" />}
          </>
        )}

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'md'}
          fullWidth={!collapsed}
          onClick={onLogout}
          className={cn(
            'text-brand-600 hover:text-error-600 hover:bg-error-50',
            collapsed && 'w-full justify-center'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>

        {version && !collapsed && (
          <p className="mt-4 text-center text-xs text-brand-400">
            v{version}
          </p>
        )}
      </div>

      {/* Collapse toggle (when collapsed) */}
      {collapsed && (
        <button
          onClick={handleToggle}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md hover:bg-brand-700"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </aside>
  );
}

export default Sidebar;
