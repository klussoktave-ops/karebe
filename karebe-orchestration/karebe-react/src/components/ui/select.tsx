import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Select Option Type
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Select Props Interface
 */
export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Label text for the select */
  label?: string;
  /** Helper text displayed below the select */
  helperText?: string;
  /** Error message displayed below the select */
  error?: string;
  /** Options for the select dropdown */
  options: SelectOption[];
  /** Placeholder text when no option is selected */
  placeholder?: string;
  /** Optional wrapper className */
  wrapperClassName?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Callback when value changes (alias for onChange) */
  onValueChange?: (value: string) => void;
}

/**
 * Select Component
 *
 * A styled dropdown select with support for labels, error states,
 * and placeholder text.
 *
 * @example
 * ```tsx
 * <Select
 *   label="Category"
 *   options={[
 *     { value: 'wine', label: 'Wine' },
 *     { value: 'spirit', label: 'Spirits' },
 *   ]}
 * />
 * ```
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      options,
      placeholder,
      id,
      disabled,
      wrapperClassName,
      size = 'md',
      onValueChange,
      ...props
    },
    ref
  ) => {
    const selectId = id || React.useId();
    const hasError = !!error;

    const sizeClasses = {
      sm: 'h-9 text-xs',
      md: 'h-11 text-sm',
      lg: 'h-12 text-base',
    };

    return (
      <div className={cn('space-y-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium',
              hasError ? 'text-error-600' : 'text-brand-700'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            onChange={(e) => {
              props.onChange?.(e);
              onValueChange?.(e.target.value);
            }}
            className={cn(
              'w-full appearance-none rounded-xl border bg-white px-4 pr-10 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400',
              'disabled:cursor-not-allowed disabled:bg-brand-50 disabled:text-brand-500',
              sizeClasses[size],
              hasError
                ? 'border-error-400 focus:ring-error-200 focus:border-error-500'
                : 'border-brand-200',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400 pointer-events-none"
            aria-hidden="true"
          />
        </div>
        {error && (
          <p
            id={`${selectId}-error`}
            className="text-sm text-error-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="text-sm text-brand-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
