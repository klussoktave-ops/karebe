import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Cart, CartItem } from '../types';

interface CartState extends Cart {
  // UI state
  isOpen: boolean;
  isSyncing: boolean;
  lastError?: string;
  
  // Actions
  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setBranchId: (branchId: string | undefined) => void;
  setCustomerId: (customerId: string | undefined) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSynced: (timestamp: string) => void;
  setError: (error: string | undefined) => void;
  
  // Computed
  getItemCount: () => number;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemByProduct: (productId: string, variantId?: string) => CartItem | undefined;
}

const initialState: Omit<CartState, 
  'addItem' | 'removeItem' | 'updateQuantity' | 'clearCart' | 
  'setBranchId' | 'setCustomerId' | 'openCart' | 'closeCart' | 'toggleCart' |
  'setSyncing' | 'setLastSynced' | 'setError' | 'getItemCount' | 'getSubtotal' | 
  'getTotal' | 'getItemByProduct'
> = {
  items: [],
  subtotal: 0,
  tax: 0,
  deliveryFee: 0,
  total: 0,
  itemCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isOpen: false,
  isSyncing: false,
};

// Helper to generate unique cart item ID
function generateItemId(productId: string, variantId?: string): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

// Helper to calculate cart totals
function calculateTotals(items: CartItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * 0.16; // 16% VAT (Kenya)
  const deliveryFee = subtotal > 5000 ? 0 : 300; // Free delivery over 5000
  const total = subtotal + tax + deliveryFee;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  return { subtotal, tax, deliveryFee, total, itemCount };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      ...initialState,

      addItem: (itemData) => {
        const { items } = get();
        const itemId = generateItemId(itemData.productId, itemData.variantId);
        const existingItemIndex = items.findIndex(item => item.id === itemId);

        let newItems: CartItem[];
        
        if (existingItemIndex >= 0) {
          // Update existing item quantity
          newItems = items.map((item, index) =>
            index === existingItemIndex
              ? { ...item, quantity: item.quantity + itemData.quantity }
              : item
          );
        } else {
          // Add new item
          const newItem: CartItem = {
            ...itemData,
            id: itemId,
            addedAt: new Date().toISOString(),
          };
          newItems = [...items, newItem];
        }

        const totals = calculateTotals(newItems);
        
        set({
          items: newItems,
          ...totals,
          updatedAt: new Date().toISOString(),
        });
      },

      removeItem: (itemId) => {
        const { items } = get();
        const newItems = items.filter(item => item.id !== itemId);
        const totals = calculateTotals(newItems);
        
        set({
          items: newItems,
          ...totals,
          updatedAt: new Date().toISOString(),
        });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        const { items } = get();
        const newItems = items.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        );
        const totals = calculateTotals(newItems);
        
        set({
          items: newItems,
          ...totals,
          updatedAt: new Date().toISOString(),
        });
      },

      clearCart: () => {
        set({
          items: [],
          subtotal: 0,
          tax: 0,
          deliveryFee: 0,
          total: 0,
          itemCount: 0,
          updatedAt: new Date().toISOString(),
        });
      },

      setBranchId: (branchId) => set({ branchId }),
      
      setCustomerId: (customerId) => set({ customerId }),

      openCart: () => set({ isOpen: true }),
      
      closeCart: () => set({ isOpen: false }),
      
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      
      setSyncing: (isSyncing) => set({ isSyncing }),
      
      setLastSynced: (lastSyncedAt) => set({ lastSyncedAt }),
      
      setError: (lastError) => set({ lastError }),
      
      getItemCount: () => get().itemCount,
      
      getSubtotal: () => get().subtotal,
      
      getTotal: () => get().total,
      
      getItemByProduct: (productId, variantId) => {
        const itemId = generateItemId(productId, variantId);
        return get().items.find(item => item.id === itemId);
      },
    }),
    {
      name: 'karebe-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        branchId: state.branchId,
        customerId: state.customerId,
        subtotal: state.subtotal,
        tax: state.tax,
        deliveryFee: state.deliveryFee,
        total: state.total,
        itemCount: state.itemCount,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

// Selector hooks for performance
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartTotal = () => useCartStore((state) => state.total);
export const useCartSubtotal = () => useCartStore((state) => state.subtotal);
export const useCartItemCount = () => useCartStore((state) => state.itemCount);
export const useCartIsOpen = () => useCartStore((state) => state.isOpen);
export const useCartBranchId = () => useCartStore((state) => state.branchId);
export const useCartIsSyncing = () => useCartStore((state) => state.isSyncing);
