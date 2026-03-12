import { useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCartStore, useCartItems, useCartTotal, useCartItemCount } from '../stores/cart-store';
import { syncCart, fetchCart } from '../api/sync-cart';
import type { CartItem, AddToCartInput } from '../types';
import type { Product, ProductVariant } from '@/features/products/types';

// Query keys
export const cartKeys = {
  all: ['cart'] as const,
  detail: (customerId?: string) => [...cartKeys.all, 'detail', customerId] as const,
};

/**
 * Main cart hook - combines local state with server sync
 */
export function useCart(customerId?: string) {
  const queryClient = useQueryClient();
  const store = useCartStore();
  const items = useCartItems();
  const total = useCartTotal();
  const itemCount = useCartItemCount();

  // Fetch cart from server for authenticated users
  const { data: serverCart, isLoading: isFetching } = useQuery({
    queryKey: cartKeys.detail(customerId),
    queryFn: () => (customerId ? fetchCart(customerId) : Promise.resolve(null)),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync cart mutation
  const syncMutation = useMutation({
    mutationFn: syncCart,
    onSuccess: (data) => {
      if (data.success && data.cart) {
        store.setLastSynced(data.cart.lastSyncedAt || new Date().toISOString());
        store.setError(undefined);
      }
    },
    onError: (error) => {
      store.setError(error instanceof Error ? error.message : 'Sync failed');
    },
  });

  // Add item to cart
  const addItem = useCallback(
    (product: Product, quantity: number = 1, variant?: ProductVariant) => {
      const unitPrice = variant?.price || product.price;
      
      store.addItem({
        productId: product.id,
        product,
        variantId: variant?.id,
        variant,
        quantity,
        unitPrice,
      });

      // Auto-sync for authenticated users
      if (customerId) {
        const currentItems = useCartStore.getState().items;
        syncMutation.mutate({
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
    },
    [customerId, store, syncMutation]
  );

  // Remove item from cart
  const removeItem = useCallback(
    (itemId: string) => {
      store.removeItem(itemId);

      if (customerId) {
        const currentItems = useCartStore.getState().items;
        syncMutation.mutate({
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
    },
    [customerId, store, syncMutation]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      store.updateQuantity(itemId, quantity);

      if (customerId) {
        const currentItems = useCartStore.getState().items;
        syncMutation.mutate({
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
    },
    [customerId, store, syncMutation]
  );

  // Manual sync
  const sync = useCallback(() => {
    if (!customerId) return Promise.resolve();

    store.setSyncing(true);
    return syncMutation
      .mutateAsync({
        customerId,
        branchId: store.branchId,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      })
      .finally(() => store.setSyncing(false));
  }, [customerId, items, store, syncMutation]);

  // Clear cart
  const clearCart = useCallback(async () => {
    store.clearCart();
    if (customerId) {
      // Clear server-side cart for authenticated users
      const { clearServerCart } = await import('../api/sync-cart');
      await clearServerCart(customerId);
      queryClient.invalidateQueries({ queryKey: cartKeys.detail(customerId) });
    }
  }, [customerId, queryClient, store]);

  // Merge server cart with local cart on login
  useEffect(() => {
    if (serverCart && items.length === 0) {
      // Server cart exists and local cart is empty - use server cart
      serverCart.items.forEach((item) => {
        store.addItem({
          productId: item.productId,
          product: item.product,
          variantId: item.variantId,
          variant: item.variant,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      });
    }
  }, [serverCart, items.length, store]);

  return {
    // State
    items,
    total,
    subtotal: store.subtotal,
    itemCount,
    isOpen: store.isOpen,
    isSyncing: store.isSyncing || syncMutation.isPending,
    isFetching,
    lastError: store.lastError,
    branchId: store.branchId,

    // Actions
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    sync,
    openCart: store.openCart,
    closeCart: store.closeCart,
    toggleCart: store.toggleCart,
    setBranchId: store.setBranchId,

    // Helpers
    getItemByProduct: store.getItemByProduct,
  };
}

/**
 * Hook for cart item operations
 */
export function useCartItem(itemId: string) {
  const items = useCartItems();
  const store = useCartStore();
  
  const item = items.find((i) => i.id === itemId);

  return {
    item,
    updateQuantity: (quantity: number) => store.updateQuantity(itemId, quantity),
    remove: () => store.removeItem(itemId),
  };
}

/**
 * Hook to check if a product is in cart
 */
export function useProductInCart(productId: string, variantId?: string) {
  const item = useCartStore((state) => state.getItemByProduct(productId, variantId));
  
  return {
    isInCart: !!item,
    quantity: item?.quantity || 0,
    item,
  };
}
