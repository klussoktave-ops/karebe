import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct, updateProduct, deleteProduct } from '../api/create-product';
import { updateStock, bulkUpdateStock } from '../api/update-stock';
import type { CreateProductInput, UpdateStockInput } from '../types';
import { productKeys } from './use-products';

/**
 * Hook for creating a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(input),
    onSuccess: (data) => {
      if (data.success && data.product) {
        // Invalidate and refetch products list
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
        
        // Add the new product to the cache
        queryClient.setQueryData(
          productKeys.detail(data.product.id),
          data.product
        );
      }
    },
  });
}

/**
 * Hook for updating an existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateProductInput> }) =>
      updateProduct(id, input),
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate product lists
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
        
        // Update the specific product in cache
        queryClient.invalidateQueries({
          queryKey: productKeys.detail(variables.id),
        });
      }
    },
  });
}

/**
 * Hook for deleting a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate and refetch products list
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
        
        // Remove the deleted product from cache
        queryClient.removeQueries({
          queryKey: productKeys.detail(variables),
        });
      }
    },
  });
}

/**
 * Hook for updating product stock
 */
export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateStockInput) => updateStock(input),
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate the specific product
        queryClient.invalidateQueries({
          queryKey: productKeys.detail(variables.productId),
        });
        
        // Invalidate product lists as stock changed
        queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      }
    },
  });
}

/**
 * Hook for bulk stock updates
 */
export function useBulkUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UpdateStockInput[]) => bulkUpdateStock(updates),
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate all product queries
        queryClient.invalidateQueries({ queryKey: productKeys.all });
      }
    },
  });
}

/**
 * Combined hook with all product mutations
 */
export function useProductMutations() {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const remove = useDeleteProduct();
  const stock = useUpdateStock();
  const bulkStock = useBulkUpdateStock();

  return {
    createProduct: create.mutateAsync,
    updateProduct: update.mutateAsync,
    deleteProduct: remove.mutateAsync,
    updateStock: stock.mutateAsync,
    bulkUpdateStock: bulkStock.mutateAsync,
    
    // Loading states
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
    isUpdatingStock: stock.isPending,
    isBulkUpdatingStock: bulkStock.isPending,
    
    // Error states
    createError: create.error,
    updateError: update.error,
    deleteError: remove.error,
    stockError: stock.error,
    bulkStockError: bulkStock.error,
  };
}
