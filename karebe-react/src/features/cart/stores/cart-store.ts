import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Cart, CartItem } from '../types';

// Railway API URL for pricing
const ORCHESTRATION_API = import.meta.env.VITE_ORCHESTRATION_API_URL || 'https://karebe-orchestration-production.up.railway.app';

// Default values (fallback if API not available)
const DEFAULT_VAT_RATE = 0.16;
const DEFAULT_BASE_FEE = 300;
const DEFAULT_FREE_THRESHOLD = 5000;

// Cache for pricing config - loaded from API
let pricingConfig: {
  vatRate: number;
  baseDeliveryFee: number;
  freeDeliveryThreshold: number;
} = {
  vatRate: DEFAULT_VAT_RATE,
  baseDeliveryFee: DEFAULT_BASE_FEE,
  freeDeliveryThreshold: DEFAULT_FREE_THRESHOLD,
};

let pricingLoaded = false;

// Fetch pricing from API
async function loadPricingConfig(): Promise<void> {
  if (pricingLoaded) return;
  
  const apiUrl = `${ORCHESTRATION_API}/api/pricing`;
  console.log('[CartStore] Attempting to load pricing from:', apiUrl);
  console.log('[CartStore] Current origin:', window.location.origin);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors', // Explicitly set CORS mode
    });
    
    console.log('[CartStore] Response status:', response.status);
    console.log('[CartStore] Response ok:', response.ok);
    console.log('[CartStore] Response headers:', [...response.headers.entries()]);
    
    // Check for CORS headers
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
    };
    console.log('[CartStore] CORS headers:', corsHeaders);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.ok && data.data?.settings) {
      const settings = data.data.settings;
      pricingConfig = {
        vatRate: settings.vat_rate?.rate ?? DEFAULT_VAT_RATE,
        baseDeliveryFee: settings.base_delivery_fee?.amount ?? DEFAULT_BASE_FEE,
        freeDeliveryThreshold: settings.free_delivery_threshold?.amount ?? DEFAULT_FREE_THRESHOLD,
      };
      pricingLoaded = true;
      console.log('[CartStore] ✅ Pricing loaded successfully from API:', pricingConfig);
    }
  } catch (error) {
    // Detailed error logging for CORS and network issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CartStore] ❌ Failed to load pricing config:', errorMessage);
    
    // Check if it's a CORS error
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      console.error('[CartStore] 🔴 Possible CORS or network error detected!');
      console.error('[CartStore] 🔴 API URL:', apiUrl);
      console.error('[CartStore] 🔴 Frontend Origin:', window.location.origin);
      console.error('[CartStore] 🔴 Please ensure Railway backend has CORS middleware configured');
    }
    
    // Log stack trace for debugging
    if (error instanceof Error && error.stack) {
      console.error('[CartStore] Stack trace:', error.stack);
    }
  }
}

// Helper to calculate cart totals - uses pricing API for delivery fee and threshold
function calculateTotals(items: CartItem[]) {
  const fee = pricingConfig.baseDeliveryFee;
  const threshold = pricingConfig.freeDeliveryThreshold;
  
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * pricingConfig.vatRate;
  const deliveryFeeAmount = subtotal > threshold ? 0 : fee; // Free delivery over threshold
  const total = subtotal + tax + deliveryFeeAmount;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  return { subtotal, tax, deliveryFee: deliveryFeeAmount, total, itemCount };
}

interface CartState extends Cart {
  // UI state
  isOpen: boolean;
  isSyncing: boolean;
  lastError?: string;
  pricingLoaded: boolean;
  
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
  loadPricing: () => Promise<void>;
  
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
  'getTotal' | 'getItemByProduct' | 'loadPricing'
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
  pricingLoaded: false,
};

// Helper to generate unique cart item ID
function generateItemId(productId: string, variantId?: string): string {
  return variantId ? `${productId}:${variantId}` : productId;
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
      
      loadPricing: async () => {
        await loadPricingConfig();
        // Recalculate totals with new pricing
        const { items } = get();
        const totals = calculateTotals(items);
        set({ ...totals, pricingLoaded: true });
      },
      
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
