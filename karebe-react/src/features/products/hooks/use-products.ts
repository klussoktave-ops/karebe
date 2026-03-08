import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProducts, getProductById, getCategories, getFeaturedProducts } from '../api/get-products';
import type { ProductFilters } from '../types';

// Query keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  featured: () => [...productKeys.all, 'featured'] as const,
  categories: () => ['categories'] as const,
};

/**
 * Hook for fetching products with filters
 */
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => getProducts(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

/**
 * Hook for fetching a single product
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => getProductById(id),
    enabled: !!id, // Only fetch if id is provided
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for fetching featured products
 */
export function useFeaturedProducts(limit: number = 8) {
  return useQuery({
    queryKey: productKeys.featured(),
    queryFn: () => getFeaturedProducts(limit),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook for fetching categories
 */
export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: getCategories,
    staleTime: 1000 * 60 * 60, // 1 hour - categories don't change often
  });
}

/**
 * Hook for product prefetching (useful for hover states)
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  const prefetchProduct = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.detail(id),
      queryFn: () => getProductById(id),
      staleTime: 1000 * 60 * 5,
    });
  };

  const prefetchProducts = (filters: ProductFilters) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.list(filters),
      queryFn: () => getProducts(filters),
      staleTime: 1000 * 60 * 2,
    });
  };

  return { prefetchProduct, prefetchProducts };
}

/**
 * Hook for infinite scroll products (alternative to pagination)
 */
export function useInfiniteProducts(initialFilters: ProductFilters = {}) {
  const queryClient = useQueryClient();

  return {
    // This would use useInfiniteQuery for true infinite scroll
    // For now, we'll use a simple approach with regular pagination
    prefetchNextPage: (nextPage: number) => {
      queryClient.prefetchQuery({
        queryKey: productKeys.list({ ...initialFilters, page: nextPage }),
        queryFn: () => getProducts({ ...initialFilters, page: nextPage }),
        staleTime: 1000 * 60 * 2,
      });
    },
  };
}
