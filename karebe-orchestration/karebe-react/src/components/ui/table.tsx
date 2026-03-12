import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Table Container Props
 */
export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Enable striped row styling */
  striped?: boolean;
  /** Enable hover effect on rows */
  hover?: boolean;
  /** Enable compact padding */
  compact?: boolean;
}

/**
 * Table Component
 *
 * Data table with support for striped rows, hover effects,
 * and various styling options.
 *
 * @example
 * ```tsx
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *       <TableHead>Status</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>John</TableCell>
 *       <TableCell>Active</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 * ```
 */
const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, striped, hover, compact, ...props }, ref) => (
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      data-striped={striped}
      data-hover={hover}
      data-compact={compact}
      {...props}
    />
  )
);
Table.displayName = 'Table';

/**
 * Table Header Component
 */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('border-b border-brand-200', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

/**
 * Table Body Component
 */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

/**
 * Table Footer Component
 */
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t border-brand-200 bg-brand-50 font-medium',
      className
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

/**
 * Table Row Props
 */
const tableRowVariants = cva(
  'border-b border-brand-100 transition-colors',
  {
    variants: {
      variant: {
        default: '',
        header: 'bg-brand-50/50 hover:bg-brand-50/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement>,
    VariantProps<typeof tableRowVariants> {}

/**
 * Table Row Component
 */
const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, variant, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        tableRowVariants({ variant }),
        'group',
        'data-[striped=true]:even:bg-brand-50/30',
        'data-[hover=true]:hover:bg-brand-50',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

/**
 * Table Head Component
 */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle font-display font-semibold text-brand-700',
      '[&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

/**
 * Table Cell Component
 */
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'p-4 align-middle',
      'group-data-[compact=true]:py-2 group-data-[compact=true]:px-3',
      '[&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

/**
 * Table Caption Component
 */
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-brand-500', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

/**
 * Table Container with overflow handling
 */
export interface TableContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable shadow on horizontal scroll */
  shadow?: boolean;
}

const TableContainer = React.forwardRef<HTMLDivElement, TableContainerProps>(
  ({ className, shadow = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative w-full overflow-auto rounded-xl border border-brand-200',
        shadow && 'shadow-card',
        className
      )}
      {...props}
    />
  )
);
TableContainer.displayName = 'TableContainer';

/**
 * Empty Table State
 */
export interface TableEmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
}

const TableEmpty = React.forwardRef<HTMLDivElement, TableEmptyProps>(
  ({ className, icon, title = 'No results', description, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 rounded-full bg-brand-100 p-3 text-brand-400">
          {icon}
        </div>
      )}
      <p className="font-medium text-brand-900">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-brand-500">{description}</p>
      )}
    </div>
  )
);
TableEmpty.displayName = 'TableEmpty';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableContainer,
  TableEmpty,
  tableRowVariants,
};
