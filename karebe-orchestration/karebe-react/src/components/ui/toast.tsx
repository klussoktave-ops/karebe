import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast variant styles
 */
const toastVariants = cva(
  'relative flex w-full items-center gap-3 rounded-xl border p-4 shadow-soft',
  {
    variants: {
      variant: {
        default: 'bg-white border-brand-200 text-brand-900',
        success: 'bg-success-50 border-success-200 text-success-900',
        error: 'bg-error-50 border-error-200 text-error-900',
        warning: 'bg-warning-50 border-warning-200 text-warning-900',
        info: 'bg-info-50 border-info-200 text-info-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Toast Props
 */
export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  /** Toast title */
  title?: string;
  /** Toast description/message */
  description?: string;
  /** Callback when toast is dismissed */
  onDismiss?: () => void;
  /** Auto dismiss duration in ms (0 to disable) */
  duration?: number;
  /** Show close button */
  showClose?: boolean;
}

/**
 * Individual Toast Component
 */
const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      className,
      variant,
      title,
      description,
      onDismiss,
      duration = 5000,
      showClose = true,
      children,
      ...props
    },
    ref
  ) => {
    // Auto dismiss
    React.useEffect(() => {
      if (duration > 0 && onDismiss) {
        const timer = setTimeout(onDismiss, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, onDismiss]);

    const Icon = {
      default: Info,
      success: CheckCircle2,
      error: AlertCircle,
      warning: AlertTriangle,
      info: Info,
    }[variant || 'default'];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <Icon
          className={cn(
            'h-5 w-5 flex-shrink-0',
            variant === 'success' && 'text-success-600',
            variant === 'error' && 'text-error-600',
            variant === 'warning' && 'text-warning-600',
            variant === 'info' && 'text-info-600',
            variant === 'default' && 'text-brand-600'
          )}
        />
        <div className="flex-1 min-w-0">
          {title && <p className="font-medium text-sm">{title}</p>}
          {description && (
            <p className="text-sm opacity-90 mt-0.5">{description}</p>
          )}
          {children}
        </div>
        {showClose && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

/**
 * Toast Context Type
 */
interface ToastContextType {
  toasts: Array<ToastItem>;
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  removeAll: () => void;
}

interface ToastItem extends Omit<ToastProps, 'onDismiss'> {
  id: string;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

/**
 * Hook to use toast context
 */
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/**
 * Toast Provider Props
 */
export interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

/**
 * Toast Provider Component
 *
 * Provides toast notification functionality to the app.
 *
 * @example
 * ```tsx
 * <ToastProvider position="top-right">
 *   <App />
 * </ToastProvider>
 *
 * // In your component:
 * const { addToast } = useToast();
 * addToast({ title: 'Success!', description: 'Item saved', variant: 'success' });
 * ```
 */
export function ToastProvider({
  children,
  maxToasts = 5,
  position = 'top-right',
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => {
        const newToasts = [{ ...toast, id }, ...prev];
        return newToasts.slice(0, maxToasts);
      });
      return id;
    },
    [maxToasts]
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeAll = React.useCallback(() => {
    setToasts([]);
  }, []);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, removeAll }}>
      {children}
      <div
        className={cn(
          'fixed z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none',
          positionClasses[position]
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto animate-slide-up">
            <Toast
              {...toast}
              onDismiss={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { Toast, toastVariants };
