import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dialog Props
 */
export interface DialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog should close */
  onClose?: () => void;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Dialog content */
  children: React.ReactNode;
  /** Whether clicking outside closes the dialog */
  closeOnOverlayClick?: boolean;
  /** Whether pressing Escape closes the dialog */
  closeOnEscape?: boolean;
  /** Maximum width of the dialog */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Hide the close button */
  hideCloseButton?: boolean;
}

/**
 * Dialog Component
 *
 * A modal dialog with overlay, supporting various sizes and close behaviors.
 *
 * @example
 * ```tsx
 * <Dialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   size="md"
 * >
 *   <p>Are you sure you want to proceed?</p>
 * </Dialog>
 * ```
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  size = 'md',
  hideCloseButton = false,
}: DialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // Handle escape key
  React.useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  // Prevent body scroll when dialog is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Focus trap
  React.useEffect(() => {
    if (!open || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    dialog.addEventListener('keydown', handleTabKey);
    return () => dialog.removeEventListener('keydown', handleTabKey);
  }, [open]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={closeOnOverlayClick ? () => onClose?.() : undefined}
        aria-hidden="true"
      />

      {/* Dialog Panel */}
      <div
        ref={dialogRef}
        className={cn(
          'relative z-10 w-full mx-4 rounded-2xl bg-white shadow-elevated',
          'transform transition-all animate-slide-up',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between p-6 pb-0">
            <div className="flex-1 pr-4">
              {title && (
                <h2 className="text-lg font-display font-semibold text-brand-950">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-brand-600">{description}</p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-brand-400 hover:text-brand-600 hover:bg-brand-100 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn('p-6', !title && 'pt-6')}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Dialog Footer Component
 */
export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Dialog Content - Wrapper for dialog body
 */
export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}

/**
 * Dialog Header
 */
export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-2', className)}>{children}</div>;
}

/**
 * Dialog Title
 */
export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn('text-lg font-display font-semibold text-brand-950', className)}>
      {children}
    </h2>
  );
}

/**
 * Dialog Description
 */
export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn('mt-1 text-sm text-brand-600', className)}>{children}</p>;
}

export { Dialog as default };
