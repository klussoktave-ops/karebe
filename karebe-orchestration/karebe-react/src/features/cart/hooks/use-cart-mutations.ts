import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '../stores/cart-store';
import { syncCart } from '../api/sync-cart';
import type { Product, ProductVariant } from '@/features/products/types';
import { cartKeys } from './use-cart';

interface AddToCartVariables {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
}

interface RemoveFromCartVariables {
  itemId: string;
  customerId?: string;
}

interface UpdateQuantityVariables {
  itemId: string;
  quantity: number;
  customerId?: string;
}

/**
 * Hook for cart mutations with server sync
 */
export function useCartMutations(customerId?: string) {
  const queryClient = useQueryClient();
  const store = useCartStore();

  // Add to cart mutation
  const addMutation = useMutation({
    mutationFn: async ({ product, quantity, variant }: AddToCartVariables) => {
      // First update local state
      const unitPrice = variant?.price || product.price;
      store.addItem({
        productId: product.id,
        product,
        variantId: variant?.id,
        variant,
        quantity,
        unitPrice,
      });

      // Then sync with server if authenticated
      if (customerId) {
        const currentItems = useCartStore.getState().items;
        return syncCart({
          customerId,
          branchId: store.branchId,
          items: currentItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: cartKeys.detail(customerId) });
      }
    },
  });

  // Remove from cart mutation
  const removeMutation = useMutation({
    mutationFn: async ({ itemId }: RemoveFromCartVariables) => {
      store.removeItem(itemId);

      if (customerId) {
        const currentItems = useCartStore.getState().items;
        return syncCart({
          customerId,
          branchId: store.branchId,
          items: currentItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: cartKeys.detail(customerId) });
      }
    },
  });

  // Update quantity mutation
  const updateMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: UpdateQuantityVariables) => {
      if (quantity <= 0) {
        store.removeItem(itemId);
      } else {
        store.updateQuantity(itemId, quantity);
      }

      if (customerId) {
        const currentItems = useCartStore.getState().items;
        return syncCart({
          customerId,
          branchId: store.branchId,
          items: currentItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: cartKeys.detail(customerId) });
      }
    },
  });

  // Clear cart mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      store.clearCart();

      if (customerId) {
        const { clearServerCart } = await import('../api/sync-cart');
        return clearServerCart(customerId);
      }

      return true;
    },
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({ queryKey: cartKeys.detail(customerId) });
      }
    },
  });

  return {
    addToCart: addMutation.mutateAsync,
    removeFromCart: removeMutation.mutateAsync,
    updateQuantity: updateMutation.mutateAsync,
    clearCart: clearMutation.mutateAsync,

    // Loading states
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    isUpdating: updateMutation.isPending,
    isClearing: clearMutation.isPending,

    // Error states
    addError: addMutation.error,
    removeError: removeMutation.error,
    updateError: updateMutation.error,
    clearError: clearMutation.error,
  };
}
