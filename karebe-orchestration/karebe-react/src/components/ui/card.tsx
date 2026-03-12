import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Card elevation variants for different visual hierarchy levels
 */
const cardVariants = cva(
  'rounded-2xl bg-white transition-all duration-200',
  {
    variants: {
      elevation: {
        none: 'border border-brand-100',
        low: 'shadow-card border border-brand-100',
        medium: 'shadow-soft border border-brand-100',
        high: 'shadow-elevated border border-brand-100',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-elevated hover:border-brand-200 hover:-translate-y-0.5',
        false: '',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      elevation: 'low',
      interactive: false,
      padding: 'md',
    },
  }
);

/**
 * Card Component Props
 */
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

/**
 * Card Component
 *
 * A flexible container component with multiple elevation levels
 * and interactive states.
 *
 * @example
 * ```tsx
 * <Card elevation="medium" padding="lg">
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>Content</CardContent>
 * </Card>
 * ```
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, elevation, interactive, padding, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ elevation, interactive, padding }), className)}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

/**
 * Card Header Component
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

/**
 * Card Title Component
 */
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'font-display text-xl font-semibold leading-none tracking-tight text-brand-950',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

/**
 * Card Description Component
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-brand-600', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

/**
 * Card Content Component
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

/**
 * Card Footer Component
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 mt-4 border-t border-brand-100', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
