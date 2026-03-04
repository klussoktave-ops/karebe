import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Input variants for different states and sizes
 */
const inputVariants = cva(
  'flex w-full rounded-xl border bg-white px-4 py-2.5 text-sm transition-all duration-200 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 disabled:cursor-not-allowed disabled:bg-brand-50 disabled:text-brand-500',
  {
    variants: {
      variant: {
        default: 'border-brand-200',
        error: 'border-error-400 focus:ring-error-200 focus:border-error-500 text-error-900',
        success: 'border-success-400 focus:ring-success-200 focus:border-success-500',
      },
      size: {
        sm: 'h-9 text-xs',
        md: 'h-11 text-sm',
        lg: 'h-12 text-base',
      },
      hasIcon: {
        true: 'pl-10',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      hasIcon: false,
    },
  }
);

/**
 * Input Props Interface
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Label text for the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Icon component to display on the left */
  icon?: React.ReactNode;
  /** Optional wrapper className */
  wrapperClassName?: string;
}

/**
 * Input Component
 *
 * A flexible text input with support for labels, icons, error states,
 and helper text.
 *
 * @example
 * ```tsx
 * <Input label="Email" placeholder="Enter your email" />
 * <Input label="Search" icon={<Search />} />
 * <Input label="Username" error="Username is required" />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      label,
      helperText,
      error,
      icon,
      id,
      disabled,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    // Generate a unique ID if not provided
    const inputId = id || React.useId();
    const hasError = !!error;
    const inputVariant = hasError ? 'error' : variant;

    return (
      <div className={cn('space-y-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium',
              hasError ? 'text-error-600' : 'text-brand-700'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              inputVariants({ variant: inputVariant, size, hasIcon: !!icon }),
              className
            )}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="flex items-center gap-1 text-sm text-error-600"
            role="alert"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-sm text-brand-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
