/**
 * UI Components - Karebe Design System
 *
 * All primitive UI components for the Karebe React application.
 * Each component uses TypeScript, forwardRef, and class-variance-authority.
 */

// Button
export { Button, buttonVariants, type ButtonProps } from './button';

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
  type CardProps,
} from './card';

// Input
export { Input, inputVariants, type InputProps } from './input';

// Select
export { Select, type SelectProps, type SelectOption } from './select';

// Badge
export { Badge, badgeVariants, type BadgeProps } from './badge';

// Toast
export {
  Toast,
  toastVariants,
  ToastProvider,
  useToast,
  type ToastProps,
  type ToastProviderProps,
} from './toast';

// Dialog
export { Dialog, DialogFooter, type DialogProps } from './dialog';

// Skeleton
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  type SkeletonProps,
  type SkeletonTextProps,
  type SkeletonCardProps,
} from './skeleton';

// Separator
export {
  Separator,
  separatorVariants,
  type SeparatorProps,
  type Orientation,
} from './separator';

// Avatar
export {
  Avatar,
  AvatarGroup,
  avatarVariants,
  type AvatarProps,
  type AvatarGroupProps,
} from './avatar';

// Dropdown Menu
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSubTrigger,
  type DropdownMenuProps,
  type DropdownMenuTriggerProps,
  type DropdownMenuContentProps,
  type DropdownMenuItemProps,
  type DropdownMenuLabelProps,
  type DropdownMenuCheckboxItemProps,
  type DropdownMenuSubTriggerProps,
} from './dropdown-menu';

// Tabs
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  tabsListVariants,
  tabsTriggerVariants,
  type TabsProps,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentProps,
} from './tabs';

// Table
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
  type TableProps,
  type TableRowProps,
  type TableContainerProps,
  type TableEmptyProps,
} from './table';

// Textarea
export { Textarea, type TextareaProps } from './textarea';

// Image Gallery
export { ImageGallery, type ImageGalleryProps } from './image-gallery';

// M-Pesa Icon
export { MpesaIcon } from './mpesa-icon';
