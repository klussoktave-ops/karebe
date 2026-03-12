import type { Product, Category } from '@/types';

// Re-export core types
export type { Product, Category };

// Product variant (for wine/spirits with different sizes)
export interface ProductVariant {
  id: string;
  productId: string;
  volume: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  sku: string;
  isDefault: boolean;
}

// Extended product with variants
export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

// Product filters
export interface ProductFilters {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isVisible?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest';
  page?: number;
  perPage?: number;
}

// Product creation input
export interface CreateProductInput {
  name: string;
  description: string;
  categoryId: string;
  images: string[];
  isAvailable: boolean;
  isVisible: boolean;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  tags: string[];
  variants?: Omit<ProductVariant, 'id' | 'productId'>[];
}

// Product update input
export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

// Stock update input
export interface UpdateStockInput {
  productId: string;
  variantId?: string;
  quantity: number;
  operation: 'set' | 'add' | 'subtract';
  reason?: string;
}

// Product visibility filter for customer vs admin
export type ProductVisibility = 'all' | 'visible' | 'hidden';

// Popular/New product flags
export interface ProductFlags {
  isPopular: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
}

// Extended product for display
export interface ProductDisplay extends ProductWithVariants, Partial<ProductFlags> {
  categoryName?: string;
  branchName?: string;
  averageRating?: number;
  reviewCount?: number;
}
