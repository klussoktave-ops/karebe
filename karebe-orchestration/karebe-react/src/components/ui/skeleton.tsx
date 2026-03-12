import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton Props
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton (can be numeric for pixels or string for any CSS value) */
  width?: number | string;
  /** Height of the skeleton (can be numeric for pixels or string for any CSS value) */
  height?: number | string;
  /** Whether to animate the skeleton */
  animate?: boolean;
  /** Border radius variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Skeleton variant */
  variant?: 'default' | 'circle' | 'text' | 'card';
}

/**
 * Skeleton Component
 *
 * Loading placeholder that mimics the shape of content while it loads.
 *
 * @example
 * ```tsx
 * <Skeleton width={200} height={24} />
 * <Skeleton variant="circle" width={40} height={40} />
 * <Skeleton variant="card" height={120} />
 * ```
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      width,
      height,
      animate = true,
      rounded = 'md',
      variant = 'default',
      style,
      ...props
    },
    ref
  ) => {
    const getSizeValue = (value: number | string | undefined): string | undefined => {
      if (value === undefined) return undefined;
      return typeof value === 'number' ? `${value}px` : value;
    };

    const roundedClasses = {
      none: 'rounded-none',
      sm: 'rounded',
      md: 'rounded-lg',
      lg: 'rounded-xl',
      xl: 'rounded-2xl',
      full: 'rounded-full',
    };

    const variantClasses = {
      default: '',
      circle: 'rounded-full',
      text: 'h-4 w-full',
      card: 'h-32 w-full rounded-xl',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-brand-200',
          variant !== 'circle' && roundedClasses[rounded],
          variantClasses[variant],
          animate && 'animate-pulse',
          className
        )}
        style={{
          width: getSizeValue(width),
          height: getSizeValue(height),
          ...style,
        }}
        aria-busy="true"
        aria-label="Loading"
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * Skeleton Text Component - Multiple lines of skeleton text
 */
export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of lines */
  lines?: number;
  /** Width of each line (can be array for different widths per line) */
  lineWidth?: (number | string)[] | number | string;
  /** Gap between lines */
  gap?: number;
  /** Whether to animate */
  animate?: boolean;
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className, lines = 3, lineWidth, gap = 2, animate = true, ...props }, ref) => {
    const getLineWidth = (index: number): number | string | undefined => {
      if (Array.isArray(lineWidth)) {
        return lineWidth[index];
      }
      return lineWidth;
    };

    return (
      <div ref={ref} className={cn('flex flex-col', className)} style={{ gap: `${gap * 0.25}rem` }} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            width={getLineWidth(index)}
            animate={animate}
            rounded="sm"
            className={index === lines - 1 ? 'w-3/4' : undefined}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

/**
 * Skeleton Card Component - Card-shaped skeleton
 */
export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show header skeleton */
  showHeader?: boolean;
  /** Whether to show content skeleton */
  showContent?: boolean;
  /** Whether to show footer skeleton */
  showFooter?: boolean;
  /** Number of content lines */
  contentLines?: number;
  /** Whether to animate */
  animate?: boolean;
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  (
    {
      className,
      showHeader = true,
      showContent = true,
      showFooter = false,
      contentLines = 3,
      animate = true,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('p-6 rounded-xl border border-brand-100 bg-white', className)}
        {...props}
      >
        {showHeader && (
          <div className="flex items-center gap-3 mb-4">
            <Skeleton variant="circle" width={40} height={40} animate={animate} />
            <div className="flex-1">
              <Skeleton height={16} width="60%" animate={animate} rounded="sm" className="mb-2" />
              <Skeleton height={12} width="40%" animate={animate} rounded="sm" />
            </div>
          </div>
        )}
        {showContent && (
          <SkeletonText lines={contentLines} animate={animate} className="mb-4" />
        )}
        {showFooter && (
          <div className="flex gap-2 pt-4 border-t border-brand-100">
            <Skeleton height={36} width={80} animate={animate} rounded="lg" />
            <Skeleton height={36} width={80} animate={animate} rounded="lg" />
          </div>
        )}
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

export { Skeleton, SkeletonText, SkeletonCard };
