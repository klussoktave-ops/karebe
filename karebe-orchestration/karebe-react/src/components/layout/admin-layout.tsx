import { useState, useEffect } from 'react';
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
  ArrowLeftRight,
  Bike,
  Menu,
  X,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAvailableRoleSwitches } from '@/features/auth/utils/role-utils';
import type { UserRole } from '@/features/auth/stores/auth-store';

const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Products', href: '/admin/products', icon: <Package className="h-5 w-5" /> },
  { label: 'Branches', href: '/admin/branches', icon: <Building2 className="h-5 w-5" /> },
  { label: 'Riders', href: '/admin/riders', icon: <Truck className="h-5 w-5" /> },
  { label: 'Admins', href: '/admin/admins', icon: <Shield className="h-5 w-5" /> },
  { label: 'Orders', href: '/admin/orders', icon: <ShoppingCart className="h-5 w-5" /> },
  { label: 'Settings', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
  { label: 'Pricing', href: '/admin/pricing', icon: <DollarSign className="h-5 w-5" /> },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const { logout, user, switchRole } = useAuth();

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
        setMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  // Get available role switches for current user
  const roleSwitches = user ? getAvailableRoleSwitches(user.role) : [];

  const handleRoleSwitch = (newRole: UserRole, route: string) => {
    switchRole(newRole);
    navigate(route);
  };

  // Close mobile menu when navigating
  const handleNavClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-white border-r transition-all duration-300 flex flex-col fixed md:relative z-50',
          'top-0 left-0 h-screen',
          // Mobile styles
          isMobile && 'transform',
          isMobile && (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'),
          // Desktop styles
          collapsed ? 'w-16' : 'w-56',
          !isMobile && 'md:transform-none'
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
          {/* Mobile close button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          <ul className="space-y-1">
            {adminNavItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  end={item.href === '/admin'}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                      collapsed && 'justify-center'
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
          {/* Role Switcher - only show if user has multiple role options */}
          {roleSwitches.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('w-full justify-start mb-2', collapsed ? 'px-2 justify-center' : '')}
                  title="Switch Role"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  {!collapsed && <span className="ml-2">Switch Role</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Switch to Role</DropdownMenuLabel>
                {roleSwitches.map((switchOption) => (
                  <DropdownMenuItem
                    key={switchOption.role}
                    onClick={() => handleRoleSwitch(switchOption.role, switchOption.route)}
                    className={cn(
                      'cursor-pointer',
                      user?.role === switchOption.role && 'bg-brand-50 text-brand-700 font-medium'
                    )}
                  >
                    {switchOption.role === 'rider' && <Bike className="h-4 w-4 mr-2" />}
                    {switchOption.role === 'admin' && <Shield className="h-4 w-4 mr-2" />}
                    {switchOption.role === 'customer' && <ArrowLeftRight className="h-4 w-4 mr-2" />}
                    {switchOption.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
            {!isMobile && (
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
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="md:hidden h-16 bg-white border-b flex items-center px-4 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="mr-4"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-brand-900">Karebe Admin</h1>
        </div>
        {children}
      </main>
    </div>
  );
}
