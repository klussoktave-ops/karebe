import * as React from 'react';
import { Menu, Search, Bell, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/**
 * Header Props
 */
export interface HeaderProps {
  /** Page title */
  title?: string;
  /** Page description/subtitle */
  description?: string;
  /** Whether to show the mobile menu toggle */
  showMenuToggle?: boolean;
  /** Callback when menu toggle is clicked */
  onMenuToggle?: () => void;
  /** User info */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
  /** Notification count */
  notificationCount?: number;
  /** Callback when notifications clicked */
  onNotificationsClick?: () => void;
  /** Search value */
  searchValue?: string;
  /** Callback when search changes */
  onSearchChange?: (value: string) => void;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Actions to display on the right */
  actions?: React.ReactNode;
  /** Breadcrumb items */
  breadcrumbs?: { label: string; href?: string }[];
}

/**
 * Header Component
 *
 * Page header with navigation, search, notifications, and user menu.
 *
 * @example
 * ```tsx
 * <Header
 *   title="Dashboard"
 *   description="Overview of your store"
 *   user={{ name: 'John Doe' }}
 *   notificationCount={5}
 * />
 * ```
 */
export function Header({
  title,
  description,
  showMenuToggle = false,
  onMenuToggle,
  user,
  notificationCount = 0,
  onNotificationsClick,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  actions,
  breadcrumbs,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-brand-100 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {showMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              className="lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <div className="flex flex-col">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-2 text-sm text-brand-500 mb-1">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span>/</span>}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="hover:text-brand-700 transition-colors"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="text-brand-900">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
            {title && (
              <h1 className="font-display text-xl font-semibold text-brand-950">
                {title}
              </h1>
            )}
            {description && !title && (
              <p className="text-sm text-brand-600">{description}</p>
            )}
          </div>
        </div>

        {/* Center section - Search */}
        {onSearchChange && (
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="w-full"
            />
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-2">
          {actions}

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationsClick}
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-brand-600" />
            {notificationCount > 0 && (
              <Badge
                variant="danger"
                size="sm"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </Button>

          {/* User menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <div className="h-8 w-8 rounded-full bg-brand-200 flex items-center justify-center text-brand-700 font-medium text-sm">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-brand-900">
                      {user.name}
                    </p>
                    {user.role && (
                      <p className="text-xs text-brand-500">{user.role}</p>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-brand-400 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-error-600">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Mobile search - shown below header on small screens */}
      {onSearchChange && (
        <div className="md:hidden border-t border-brand-100 px-4 py-3">
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="w-full"
          />
        </div>
      )}
    </header>
  );
}

export default Header;
