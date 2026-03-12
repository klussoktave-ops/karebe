import type { Product, ProductVariant } from '@/features/products/types';

// Cart item with product details
export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  variantId?: string;
  variant?: ProductVariant;
  quantity: number;
  unitPrice: number;
  addedAt: string;
}

// Cart state
export interface Cart {
  id?: string;
  customerId?: string;
  items: CartItem[];
  branchId?: string;
  
  // Computed values (stored for performance)
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  
  // Metadata
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Add to cart input
export interface AddToCartInput {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

// Update cart item input
export interface UpdateCartItemInput {
  itemId: string;
  quantity: number;
}

// Remove from cart input
export interface RemoveFromCartInput {
  itemId: string;
}

// Cart sync input
export interface SyncCartInput {
  customerId?: string;
  branchId?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
}

// Cart validation error
export interface CartValidationError {
  itemId: string;
  productId: string;
  message: string;
  type: 'out_of_stock' | 'price_changed' | 'unavailable';
}

// Cart sync response
export interface CartSyncResponse {
  success: boolean;
  cart?: Cart;
  errors?: CartValidationError[];
  message?: string;
}

// Delivery options
export interface DeliveryOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedTime: string;
}

// Saved cart (for authenticated users)
export interface SavedCart {
  id: string;
  customerId: string;
  items: CartItem[];
  savedAt: string;
  name?: string;
}
