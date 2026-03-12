import * as React from 'react';
import { User } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Avatar size variants
 */
const avatarVariants = cva('relative inline-flex items-center justify-center overflow-hidden bg-brand-100 text-brand-600', {
  variants: {
    size: {
      xs: 'h-6 w-6 text-[10px]',
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
      '2xl': 'h-20 w-20 text-xl',
    },
    shape: {
      circle: 'rounded-full',
      square: 'rounded-lg',
    },
  },
  defaultVariants: {
    size: 'md',
    shape: 'circle',
  },
});

/**
 * Avatar Props
 */
export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  /** Image URL for the avatar */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Initials to display when no image */
  initials?: string;
  /** Status indicator */
  status?: 'online' | 'offline' | 'away' | 'busy';
}

/**
 * Avatar Component
 *
 * Displays a user avatar with image support, fallback initials,
 * and status indicators.
 *
 * @example
 * ```tsx
 * <Avatar src="/user.jpg" alt="John Doe" />
 * <Avatar initials="JD" size="lg" />
 * <Avatar status="online" />
 * ```
 */
const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    { className, size, shape, src, alt, initials, status, ...props },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);

    const statusColors = {
      online: 'bg-success-500',
      offline: 'bg-brand-300',
      away: 'bg-warning-500',
      busy: 'bg-error-500',
    };

    const statusSizes = {
      xs: 'h-1.5 w-1.5',
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
      xl: 'h-4 w-4',
      '2xl': 'h-5 w-5',
    };

    const showImage = src && !imageError;
    const showInitials = !showImage && initials;

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size, shape }), className)}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : showInitials ? (
          <span className="font-medium">{initials}</span>
        ) : (
          <User className="h-1/2 w-1/2 opacity-60" />
        )}

        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full border-2 border-white',
              statusColors[status],
              statusSizes[size || 'md']
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

/**
 * Avatar Group Props
 */
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum number of avatars to display */
  max?: number;
  /** Total count for the overflow indicator */
  total?: number;
  /** Spacing between avatars */
  spacing?: 'tight' | 'normal' | 'loose';
}

/**
 * Avatar Group Component
 *
 * Displays a group of avatars with overflow handling.
 *
 * @example
 * ```tsx
 * <AvatarGroup max={3}>
 *   <Avatar initials="JD" />
 *   <Avatar initials="AS" />
 *   <Avatar initials="MK" />
 * </AvatarGroup>
 * ```
 */
const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    { className, children, max = 4, total, spacing = 'normal', ...props },
    ref
  ) => {
    const childrenArray = React.Children.toArray(children);
    const displayCount = Math.min(childrenArray.length, max);
    const overflowCount = total || childrenArray.length - displayCount;

    const spacingClasses = {
      tight: '-space-x-2',
      normal: '-space-x-3',
      loose: '-space-x-1',
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center', spacingClasses[spacing], className)}
        {...props}
      >
        {childrenArray.slice(0, displayCount).map((child, index) => (
          <div key={index} className="relative">
            {child}
          </div>
        ))}
        {overflowCount > 0 && (
          <Avatar
            initials={`+${overflowCount}`}
            size="md"
            className="bg-brand-200 text-brand-700 border-2 border-white"
          />
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup, avatarVariants };
