import { supabase } from '@/lib/supabase';
import { demoProducts } from '@/lib/demo-data';
import type { CartSyncResponse, Cart, CartValidationError } from '../types';
import { getDeliveryFee, getFreeDeliveryThreshold } from '@/features/settings/hooks/use-settings';

// Check if Supabase is configured with real credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('your-project');

// localStorage key for demo cart
const DEMO_CART_KEY = 'karebe-demo-cart';

interface SyncCartApiInput {
  customerId?: string;
  branchId?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/**
 * Demo cart sync using localStorage
 */
async function syncDemoCart(input: SyncCartApiInput): Promise<CartSyncResponse> {
  await new Promise(resolve => setTimeout(resolve, 100));

  const errors: CartValidationError[] = [];
  const validatedItems = [];

  for (const item of input.items) {
    // Find product in demo data
    const demoProduct = demoProducts.find(p => p.id === item.productId);

    if (!demoProduct || !demoProduct.isActive) {
      errors.push({
        itemId: item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
        productId: item.productId,
        type: 'unavailable',
        message: 'Product no longer available',
      });
      continue;
    }

    // Check variant
    let variant = null;
    let stockQuantity = 0;
    let currentPrice = 0;

    if (item.variantId) {
      variant = demoProduct.variants.find(v => v.id === item.variantId);
      if (!variant) {
        errors.push({
          itemId: `${item.productId}:${item.variantId}`,
          productId: item.productId,
          type: 'unavailable',
          message: 'Selected variant no longer available',
        });
        continue;
      }
      stockQuantity = variant.stock;
      currentPrice = variant.price;
    } else {
      // Use first variant as default
      variant = demoProduct.variants[0];
      stockQuantity = demoProduct.variants.reduce((sum, v) => sum + v.stock, 0);
      currentPrice = variant?.price ?? 0;
    }

    // Check stock
    if (stockQuantity < item.quantity) {
      errors.push({
        itemId: item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
        productId: item.productId,
        type: 'out_of_stock',
        message: `Only ${stockQuantity} items available`,
      });
      continue;
    }

    // Check price change
    if (currentPrice !== item.unitPrice) {
      errors.push({
        itemId: item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
        productId: item.productId,
        type: 'price_changed',
        message: `Price changed from ${item.unitPrice} to ${currentPrice}`,
      });
    }

    validatedItems.push({
      ...item,
      validatedPrice: currentPrice,
      maxQuantity: stockQuantity,
      product: {
        id: demoProduct.id,
        name: demoProduct.name,
        description: demoProduct.description,
        price: currentPrice,
        categoryId: demoProduct.categoryId,
        images: demoProduct.images,
        stockQuantity: stockQuantity,
        isAvailable: demoProduct.isActive,
        isVisible: demoProduct.isActive,
        tags: demoProduct.tags,
        createdAt: demoProduct.createdAt,
        updatedAt: demoProduct.createdAt,
      },
      variant: variant ? {
        id: variant.id,
        productId: demoProduct.id,
        volume: variant.size,
        price: variant.price,
        compareAtPrice: variant.comparePrice,
        stock: variant.stock,
        sku: variant.sku,
        isDefault: variant.id === demoProduct.variants[0]?.id,
      } : undefined,
    });
  }

  // Calculate totals
  const subtotal = validatedItems.reduce(
    (sum, item) => sum + item.validatedPrice * item.quantity,
    0
  );
  const tax = subtotal * 0.16;
  const deliveryFee = subtotal > getFreeDeliveryThreshold() ? 0 : getDeliveryFee();
  const total = subtotal + tax + deliveryFee;

  const cart: Cart = {
    customerId: input.customerId,
    branchId: input.branchId,
    items: validatedItems.map((item) => ({
      id: item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: item.validatedPrice,
      product: item.product,
      variant: item.variant,
      addedAt: new Date().toISOString(),
    })),
    subtotal,
    tax,
    deliveryFee,
    total,
    itemCount: validatedItems.reduce((sum, item) => sum + item.quantity, 0),
    lastSyncedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save to localStorage
  localStorage.setItem(DEMO_CART_KEY, JSON.stringify(cart));

  return {
    success: true,
    cart,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Sync cart with server
 * Validates items, updates stock, and persists cart for authenticated users
 */
export async function syncCart(input: SyncCartApiInput): Promise<CartSyncResponse> {
  // Use demo cart sync if Supabase is not configured
  if (!isSupabaseConfigured) {
    return syncDemoCart(input);
  }

  try {
    // Validate cart items against database
    const errors: CartValidationError[] = [];
    const validatedItems = [];

    for (const item of input.items) {
      // Fetch current product data
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*, variants:product_variants(*)')
        .eq('id', item.productId)
        .single();

      if (productError || !product) {
        errors.push({
          itemId: item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
          productId: item.productId,
          type: 'unavailable',
          message: 'Product no longer available',
        });
        continue;
      }

      // Check if product is available
      if (!product.is_available || !product.is_visible) {
        errors.push({
          itemId: item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
          productId: item.productId,
          type: 'unavailable',
          message: 'Product is no longer available',
        });
        continue;
      }

      // Check stock for variant or product
      let stockQuantity: number;
      let currentPrice: number;

      if (item.variantId) {
        const variant = product.variants?.find((v: { id: string }) => v.id === item.variantId);
        if (!variant) {
          errors.push({
            itemId: `${item.productId}:${item.variantId}`,
            productId: item.productId,
            type: 'unavailable',
            message: 'Selected variant no longer available',
          });
          continue;
        }
        stockQuantity = variant.stock;
        currentPrice = variant.price;
      } else {
        stockQuantity = product.stock_quantity;
        currentPrice = product.price;
      }

      // Check stock availability
      if (stockQuantity < item.quantity) {
        errors.push({
          itemId: item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
          productId: item.productId,
          type: 'out_of_stock',
          message: `Only ${stockQuantity} items available`,
        });
        continue;
      }

      // Check price change
      if (currentPrice !== item.unitPrice) {
        errors.push({
          itemId: item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
          productId: item.productId,
          type: 'price_changed',
          message: `Price changed from ${item.unitPrice} to ${currentPrice}`,
        });
      }

      validatedItems.push({
        ...item,
        validatedPrice: currentPrice,
        maxQuantity: stockQuantity,
        product,
      });
    }

    // If authenticated, persist cart to database
    if (input.customerId && validatedItems.length > 0) {
      await persistCartToDatabase(input.customerId, input.branchId, validatedItems);
    }

    // Calculate totals
    const subtotal = validatedItems.reduce(
      (sum, item) => sum + item.validatedPrice * item.quantity,
      0
    );
    const tax = subtotal * 0.16;
    const deliveryFee = subtotal > getFreeDeliveryThreshold() ? 0 : getDeliveryFee();
    const total = subtotal + tax + deliveryFee;

    const cart: Cart = {
      customerId: input.customerId,
      branchId: input.branchId,
      items: validatedItems.map((item) => ({
        id: item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.validatedPrice,
        product: item.product,
        addedAt: new Date().toISOString(),
      })),
      subtotal,
      tax,
      deliveryFee,
      total,
      itemCount: validatedItems.reduce((sum, item) => sum + item.quantity, 0),
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      cart,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Cart sync error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to sync cart',
    };
  }
}

/**
 * Persist cart to database for authenticated users
 */
async function persistCartToDatabase(
  customerId: string,
  branchId: string | undefined,
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    validatedPrice: number;
  }>
): Promise<void> {
  // DEBUG: Log what's being persisted
  console.log('[Cart Debug] persistCartToDatabase called with customerId:', customerId);
  console.log('[Cart Debug] branchId:', branchId);
  console.log('[Cart Debug] items count:', items.length);
  
  // Delete existing cart items for this customer
  console.log('[Cart Debug] Deleting existing cart items for user_id:', customerId);
  const deleteResult = await supabase.from('cart_items').delete().eq('user_id', customerId);
  if (deleteResult.error) {
    console.error('[Cart Debug] Delete error:', deleteResult.error);
  }

  // Insert new cart items
  if (items.length > 0) {
    const cartItems = items.map((item) => ({
      user_id: customerId,
      branch_id: branchId,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
      // Note: cart_items schema doesn't have unit_price, need to fetch from product
      created_at: new Date().toISOString(),
    }));

    console.log('[Cart Debug] Inserting cart items:', JSON.stringify(cartItems, null, 2));

    const { error } = await supabase.from('cart_items').insert(cartItems);

    if (error) {
      console.error('Failed to persist cart:', error);
      // Non-critical error, cart is still in localStorage
    }
  }
}

/**
 * Fetch cart for authenticated user from database
 */
export async function fetchCart(customerId: string): Promise<Cart | null> {
  // Use localStorage for demo mode
  if (!isSupabaseConfigured) {
    try {
      const savedCart = localStorage.getItem(DEMO_CART_KEY);
      if (!savedCart) return null;
      
      const cart: Cart = JSON.parse(savedCart);
      return cart.customerId === customerId ? cart : null;
    } catch {
      return null;
    }
  }

  try {
    // DEBUG: Log the query parameters being used
    console.log('[Cart Debug] fetchCart called with customerId:', customerId);
    console.log('[Cart Debug] Supabase URL configured:', !!supabaseUrl, supabaseUrl?.substring(0, 20) + '...');
    console.log('[Cart Debug] isSupabaseConfigured:', isSupabaseConfigured);
    
    // Check if Supabase client exists
    if (!supabase) {
      console.error('[Cart Debug] Supabase client is null!');
      throw new Error('Supabase client not initialized');
    }
    
    // Build the query - fetch cart items without embedding to avoid FK issues
    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });
    
    console.log('[Cart Debug] Executing cart query with user_id:', customerId);
    
    if (error) {
      console.error('[Cart Debug] Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to fetch cart: ${error.message}`);
    }

    if (!cartItems || cartItems.length === 0) {
      return null;
    }

    // Manually fetch products and variants since we can't embed due to FK issues
    const productIds = [...new Set(cartItems.map((item: any) => item.product_id))];
    const variantIds = [...new Set(cartItems.map((item: any) => item.variant_id).filter(Boolean))];
    
    const [productsRes, variantsRes] = await Promise.all([
      supabase.from('products').select('*').in('id', productIds),
      variantIds.length > 0 ? supabase.from('product_variants').select('*').in('id', variantIds) : Promise.resolve({ data: [] })
    ]);
    
    const products = productsRes.data || [];
    const variants = variantsRes.data || [];

    const items = cartItems.map((item: any) => {
      const product = products.find((p: any) => p.id === item.product_id);
      const variant = variants.find((v: any) => v.id === item.variant_id);
      return {
        id: item.variant_id ? `${item.product_id}:${item.variant_id}` : item.product_id,
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
        unitPrice: variant?.price || product?.price || 0,
        product,
        variant,
        addedAt: item.created_at,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const tax = subtotal * 0.16;
    const deliveryFee = subtotal > getFreeDeliveryThreshold() ? 0 : getDeliveryFee();
    const total = subtotal + tax + deliveryFee;

    return {
      customerId,
      branchId: cartItems[0]?.branch_id,
      items,
      subtotal,
      tax,
      deliveryFee,
      total,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      lastSyncedAt: new Date().toISOString(),
      createdAt: cartItems[0]?.created_at,
      updatedAt: cartItems[cartItems.length - 1]?.created_at,
    };
  } catch (error) {
    console.error('Fetch cart error:', error);
    return null;
  }
}

/**
 * Clear server-side cart
 */
export async function clearServerCart(customerId: string): Promise<boolean> {
  // Clear localStorage for demo mode
  if (!isSupabaseConfigured) {
    localStorage.removeItem(DEMO_CART_KEY);
    return true;
  }

  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', customerId);

    if (error) {
      throw new Error(`Failed to clear cart: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Clear cart error:', error);
    return false;
  }
}
