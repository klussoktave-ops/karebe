import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge variants for different status types
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-brand-100 text-brand-800',
        gold: 'bg-gold-100 text-gold-700 border border-gold-200',
        success: 'bg-success-100 text-success-700 border border-success-200',
        warning: 'bg-warning-100 text-warning-700 border border-warning-200',
        danger: 'bg-error-100 text-error-700 border border-error-200',
        info: 'bg-info-100 text-info-700 border border-info-200',
        outline: 'border border-brand-200 text-brand-700',
        secondary: 'bg-brand-50 text-brand-600',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

/**
 * Badge Props Interface
 */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional dot indicator color */
  dotColor?: string;
  /** Show a dot indicator before the badge text */
  showDot?: boolean;
}

/**
 * Badge Component
 *
 * A status indicator component with multiple color variants.
 * Supports dot indicators and various sizes.
 *
 * @example
 * ```tsx
 * <Badge variant="gold">Premium</Badge>
 * <Badge variant="success" showDot>Active</Badge>
 * <Badge variant="danger" size="lg">Critical</Badge>
 * ```
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant, size, showDot, dotColor, children, ...props },
    ref
  ) => {
    const getDotColor = () => {
      if (dotColor) return dotColor;
      switch (variant) {
        case 'gold':
          return 'bg-gold-500';
        case 'success':
          return 'bg-success-500';
        case 'warning':
          return 'bg-warning-500';
        case 'danger':
          return 'bg-error-500';
        case 'info':
          return 'bg-info-500';
        default:
          return 'bg-brand-500';
      }
    };

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {showDot && (
          <span
            className={cn('h-1.5 w-1.5 rounded-full', getDotColor())}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
