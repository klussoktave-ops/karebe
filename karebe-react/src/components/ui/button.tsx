import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Button Variants using class-variance-authority
 * Follows the warm premium aesthetic with brand colors
 */
const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md',
        secondary:
          'bg-brand-100 text-brand-900 hover:bg-brand-200',
        ghost:
          'hover:bg-brand-100 hover:text-brand-900 text-brand-700',
        danger:
          'bg-error-600 text-white shadow-sm hover:bg-error-700 hover:shadow-md',
        outline:
          'border-2 border-brand-200 bg-transparent text-brand-700 hover:bg-brand-50 hover:border-brand-300',
        gold:
          'bg-gold-500 text-brand-950 shadow-sm hover:bg-gold-400 hover:shadow-md font-semibold',
        link:
          'text-brand-600 underline-offset-4 hover:underline hover:text-brand-700',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-base',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

/**
 * Button Props Interface
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Loading state - shows spinner and disables button */
  isLoading?: boolean;
  /** Loading text to display instead of children */
  loadingText?: string;
}

/**
 * Button Component
 *
 * Primary UI button with multiple variants and sizes.
 * Supports loading states, icons, and full customization.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="danger" isLoading>Deleting...</Button>
 * <Button variant="gold" fullWidth>Checkout</Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      loadingText,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {isLoading && loadingText ? loadingText : children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
