import * as React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dropdown Menu Context
 */
interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | undefined>(
  undefined
);

function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('Dropdown components must be used within DropdownMenu');
  }
  return context;
}

/**
 * Dropdown Menu Props
 */
export interface DropdownMenuProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Dropdown Menu Component
 *
 * Container for dropdown menu functionality.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenuTrigger>Open</DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem>Item 1</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 * ```
 */
export function DropdownMenu({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (value: boolean) => {
    if (!isControlled) setUncontrolledOpen(value);
    onOpenChange?.(value);
  };

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

/**
 * Dropdown Menu Trigger Props
 */
export interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

/**
 * Dropdown Menu Trigger
 */
export function DropdownMenuTrigger({
  children,
  asChild,
  className,
}: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef } = useDropdownMenu();

  const handleClick = () => {
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      ref: triggerRef,
      onClick: handleClick,
      'aria-expanded': open,
      'aria-haspopup': true,
    });
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={handleClick}
      aria-expanded={open}
      aria-haspopup="true"
      className={className}
    >
      {children}
    </button>
  );
}

/**
 * Dropdown Menu Content Props
 */
export interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

/**
 * Dropdown Menu Content
 */
export function DropdownMenuContent({
  children,
  className,
  align = 'center',
  sideOffset = 4,
}: DropdownMenuContentProps) {
  const { open, setOpen, triggerRef } = useDropdownMenu();
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, setOpen, triggerRef]);

  // Close on escape
  React.useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, setOpen, triggerRef]);

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg',
        'animate-fade-in',
        alignClasses[align],
        className
      )}
      style={{ top: `calc(100% + ${sideOffset}px)` }}
      role="menu"
    >
      {children}
    </div>
  );
}

/**
 * Dropdown Menu Item Props
 */
export interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
}

/**
 * Dropdown Menu Item
 */
export const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(({ className, inset, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      role="menuitem"
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg px-2.5 py-2 text-sm outline-none',
        'text-gray-900 hover:bg-brand-50 hover:text-brand-900',
        'focus:bg-brand-50 focus:text-brand-900',
        'disabled:pointer-events-none disabled:opacity-50',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

/**
 * Dropdown Menu Label Props
 */
export interface DropdownMenuLabelProps
  extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

/**
 * Dropdown Menu Label
 */
export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: DropdownMenuLabelProps) {
  return (
    <div
      className={cn(
        'px-2.5 py-1.5 text-xs font-semibold text-brand-500',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  );
}

/**
 * Dropdown Menu Separator
 */
export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('-mx-1 my-1 h-px bg-brand-100', className)}
      {...props}
    />
  );
}

/**
 * Dropdown Menu Checkbox Item Props
 */
export interface DropdownMenuCheckboxItemProps {
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Dropdown Menu Checkbox Item
 */
export function DropdownMenuCheckboxItem({
  children,
  checked,
  onCheckedChange,
  disabled,
  className,
}: DropdownMenuCheckboxItemProps) {
  return (
    <button
      role="menuitemcheckbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg px-2.5 py-2 text-sm outline-none',
        'text-brand-700 hover:bg-brand-50 hover:text-brand-900',
        'focus:bg-brand-50 focus:text-brand-900',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
    >
      <span className="mr-2 flex h-4 w-4 items-center justify-center rounded border border-brand-300">
        {checked && <Check className="h-3 w-3 text-brand-600" />}
      </span>
      {children}
    </button>
  );
}

/**
 * Dropdown Menu Sub Trigger Props
 */
export interface DropdownMenuSubTriggerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

/**
 * Dropdown Menu Sub Trigger
 */
export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <div
      className={cn(
        'flex cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-2 text-sm',
        'text-brand-700 hover:bg-brand-50 hover:text-brand-900',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-4 w-4" />
    </div>
  );
}
