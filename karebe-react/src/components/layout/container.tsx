import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Container size variants
 */
type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Container Props
 */
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width of the container */
  size?: ContainerSize;
  /** Whether to center the container horizontally */
  centered?: boolean;
  /** Add horizontal padding */
  padding?: boolean;
  /** Additional vertical padding */
  verticalPadding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Container Component
 *
 * A wrapper component that constrains content width and provides consistent spacing.
 *
 * @example
 * ```tsx
 * <Container size="lg" padding>
 *   <h1>Page Content</h1>
 * </Container>
 * ```
 */
export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      className,
      size = 'lg',
      centered = true,
      padding = true,
      verticalPadding = 'none',
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses: Record<ContainerSize, string> = {
      sm: 'max-w-3xl',
      md: 'max-w-4xl',
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-none',
    };

    const verticalPaddingClasses = {
      none: '',
      sm: 'py-4',
      md: 'py-6',
      lg: 'py-8',
      xl: 'py-12',
    };

    return (
      <div
        ref={ref}
        className={cn(
          sizeClasses[size],
          centered && 'mx-auto',
          padding && 'px-4 sm:px-6 lg:px-8',
          verticalPaddingClasses[verticalPadding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';

/**
 * Page Container Props
 */
export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the sidebar is present (adjusts margin) */
  hasSidebar?: boolean;
  /** Whether the sidebar is collapsed */
  sidebarCollapsed?: boolean;
  /** Container size */
  size?: ContainerSize;
}

/**
 * Page Container Component
 *
 * A specialized container for page content that accounts for sidebar width.
 *
 * @example
 * ```tsx
 * <PageContainer hasSidebar>
 *   <h1>Page Title</h1>
 *   <p>Page content...</p>
 * </PageContainer>
 * ```
 */
export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  (
    {
      className,
      hasSidebar = false,
      sidebarCollapsed = false,
      size = 'full',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <main
        ref={ref}
        className={cn(
          'min-h-screen transition-all duration-300',
          hasSidebar && (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'),
          className
        )}
        {...props}
      >
        <Container size={size} verticalPadding="md">
          {children}
        </Container>
      </main>
    );
  }
);

PageContainer.displayName = 'PageContainer';

/**
 * Page Header Props
 */
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Page title */
  title?: string;
  /** Page description */
  description?: string;
  /** Actions displayed on the right */
  actions?: React.ReactNode;
  /** Breadcrumb items */
  breadcrumbs?: { label: string; href?: string }[];
}

/**
 * Page Header Component
 *
 * Standard page header with title, description, and actions.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Products"
 *   description="Manage your product catalog"
 *   actions={<Button>Add Product</Button>}
 * />
 * ```
 */
export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  (
    { className, title, description, actions, breadcrumbs, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
          className
        )}
        {...props}
      >
        <div className="space-y-1">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-2 text-sm text-brand-500">
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
            <h1 className="font-display text-2xl font-bold text-brand-950">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-brand-600 max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';
