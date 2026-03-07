import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Settings,
  LogOut,
  Building2,
  Shield,
  ChevronLeft,
  ChevronRight,
  Wine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/hooks/use-auth';

const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Products', href: '/admin/products', icon: <Package className="h-5 w-5" /> },
  { label: 'Branches', href: '/admin/branches', icon: <Building2 className="h-5 w-5" /> },
  { label: 'Riders', href: '/admin/riders', icon: <Truck className="h-5 w-5" /> },
  { label: 'Admins', href: '/admin/admins', icon: <Shield className="h-5 w-5" /> },
  { label: 'Orders', href: '/admin/orders', icon: <ShoppingCart className="h-5 w-5" /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-white border-r transition-all duration-300 flex flex-col',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Wine className="h-6 w-6 text-brand-600" />
              <span className="font-bold text-brand-900">Karebe</span>
            </div>
          )}
          {collapsed && (
            <Wine className="h-6 w-6 text-brand-600 mx-auto" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2">
          <ul className="space-y-1">
            {adminNavItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  end={item.href === '/admin'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User & Collapse */}
        <div className="p-2 border-t">
          {!collapsed && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'Admin'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.phone || user?.email || 'Logged in'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className={cn('flex-1', collapsed ? 'px-2' : '')}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Logout</span>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="px-2"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
