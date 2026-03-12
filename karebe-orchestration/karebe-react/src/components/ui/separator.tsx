import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Separator orientation type
 */
type Orientation = 'horizontal' | 'vertical';

/**
 * Separator variants
 */
const separatorVariants = cva('shrink-0 bg-brand-200', {
  variants: {
    orientation: {
      horizontal: 'h-px w-full',
      vertical: 'w-px h-full',
    },
    variant: {
      default: 'bg-brand-200',
      brand: 'bg-brand-300',
      gold: 'bg-gold-300',
      subtle: 'bg-brand-100',
    },
    thickness: {
      thin: 'h-px w-px',
      default: '',
      thick: 'h-0.5 w-0.5',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
    variant: 'default',
  },
});

/**
 * Separator Props
 */
export interface SeparatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof separatorVariants> {
  /** Text to display in the middle of the separator (horizontal only) */
  label?: string;
  /** Decorative separator - won't be announced by screen readers */
  decorative?: boolean;
}

/**
 * Separator Component
 *
 * Visual divider between content sections.
 * Can be horizontal or vertical with various styling options.
 *
 * @example
 * ```tsx
 * <Separator />
 * <Separator orientation="vertical" />
 * <Separator label="OR" />
 * <Separator variant="gold" />
 * ```
 */
const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      className,
      orientation = 'horizontal',
      variant,
      thickness,
      label,
      decorative = true,
      ...props
    },
    ref
  ) => {
    // Calculate aria attributes
    const ariaProps = decorative
      ? { 'aria-hidden': true }
      : { role: 'separator', 'aria-orientation': orientation };

    if (label && orientation === 'horizontal') {
      return (
        <div
          ref={ref}
          className={cn('flex items-center gap-4 w-full', className)}
          {...props}
        >
          <div
            className={cn(separatorVariants({ orientation, variant, thickness }), 'flex-1')}
            {...ariaProps}
          />
          <span className="text-sm text-brand-500 font-medium whitespace-nowrap">
            {label}
          </span>
          <div
            className={cn(separatorVariants({ orientation, variant, thickness }), 'flex-1')}
            {...ariaProps}
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(separatorVariants({ orientation, variant, thickness }), className)}
        {...ariaProps}
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';

export { Separator, separatorVariants };
export type { Orientation };
