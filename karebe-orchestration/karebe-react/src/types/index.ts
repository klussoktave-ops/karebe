// Core types for Karebe React application

// Order Status Enum
export const OrderStatus = {
  CART_DRAFT: 'CART_DRAFT',
  ORDER_SUBMITTED: 'ORDER_SUBMITTED',
  CONFIRMED_BY_MANAGER: 'CONFIRMED_BY_MANAGER',
  DELIVERY_REQUEST_STARTED: 'DELIVERY_REQUEST_STARTED',
  RIDER_CONFIRMED_DIGITAL: 'RIDER_CONFIRMED_DIGITAL',
  RIDER_CONFIRMED_MANUAL: 'RIDER_CONFIRMED_MANUAL',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  categoryId: string;
  images: string[];
  stockQuantity: number;
  isAvailable: boolean;
  isVisible: boolean;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  sortOrder: number;
}

// Cart types
export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

// Order types
export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface Order {
  id: string;
  userId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// User types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: 'customer' | 'admin' | 'rider';
  avatar?: string;
  createdAt: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
