/**
 * Products Feature - Karebe React
 *
 * Product catalog, management, and inventory.
 */

// API
export { createProduct } from './api/create-product';
export { getProducts } from './api/get-products';
export { updateStock } from './api/update-stock';

// Components
export { ProductCard } from './components/product-card';
export { ProductFilters } from './components/product-filters';
export { ProductGrid } from './components/product-grid';

// Hooks
export { useProducts } from './hooks/use-products';
export { useProductMutations } from './hooks/use-product-mutations';

// Stores
export { useProductFilters } from './stores/product-filters';

// Types
export type {
  ProductVariant,
  ProductWithVariants,
  ProductFilters as ProductFiltersType,
  CreateProductInput,
  UpdateProductInput,
  UpdateStockInput,
  ProductVisibility,
  ProductFlags,
  ProductDisplay,
} from './types';
