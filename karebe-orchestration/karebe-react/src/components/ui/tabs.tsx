import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Tabs Context
 */
interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within Tabs');
  }
  return context;
}

/**
 * Tabs Props
 */
export interface TabsProps {
  /** The controlled value of the tab to show */
  value?: string;
  /** The value of the tab that should be selected by default */
  defaultValue?: string;
  /** Callback when the active tab changes */
  onValueChange?: (value: string) => void;
  /** Tab children */
  children: React.ReactNode;
  className?: string;
}

/**
 * Tabs Component
 *
 * Accessible tab navigation with keyboard support.
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="account">
 *   <TabsList>
 *     <TabsTrigger value="account">Account</TabsTrigger>
 *     <TabsTrigger value="settings">Settings</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="account">Account settings</TabsContent>
 *   <TabsContent value="settings">General settings</TabsContent>
 * </Tabs>
 * ```
 */
export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue || ''
  );
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

/**
 * Tabs List Props
 */
const tabsListVariants = cva(
  'inline-flex items-center justify-center rounded-xl bg-brand-50 p-1',
  {
    variants: {
      variant: {
        default: 'bg-brand-50',
        pills: 'bg-transparent gap-1',
        underline: 'bg-transparent rounded-none border-b border-brand-200 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TabsListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabsListVariants> {}

/**
 * Tabs List Component
 */
export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
);
TabsList.displayName = 'TabsList';

/**
 * Tabs Trigger Props
 */
const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'text-brand-600 hover:text-brand-900 hover:bg-white data-[state=active]:bg-white data-[state=active]:text-brand-900 data-[state=active]:shadow-sm',
        pills:
          'text-brand-600 hover:text-brand-900 hover:bg-brand-100 data-[state=active]:bg-brand-600 data-[state=active]:text-white',
        underline:
          'rounded-none border-b-2 border-transparent text-brand-600 hover:text-brand-900 hover:border-brand-200 data-[state=active]:border-brand-600 data-[state=active]:text-brand-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TabsTriggerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'>,
    VariantProps<typeof tabsTriggerVariants> {
  /** Unique value for this tab */
  value: string;
}

/**
 * Tabs Trigger Component
 */
export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>(({ className, variant, value, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = useTabs();
  const isSelected = selectedValue === value;

  return (
    <button
      ref={ref}
      role="tab"
      type="button"
      aria-selected={isSelected}
      data-state={isSelected ? 'active' : 'inactive'}
      onClick={() => onValueChange(value)}
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
});
TabsTrigger.displayName = 'TabsTrigger';

/**
 * Tabs Content Props
 */
export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Unique value matching a TabsTrigger */
  value: string;
}

/**
 * Tabs Content Component
 */
export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue } = useTabs();
    const isSelected = selectedValue === value;

    if (!isSelected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        data-state={isSelected ? 'active' : 'inactive'}
        className={cn('mt-4 focus-visible:outline-none', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = 'TabsContent';

export { tabsListVariants, tabsTriggerVariants };
