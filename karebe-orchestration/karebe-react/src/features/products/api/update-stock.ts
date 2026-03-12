import { supabase } from '@/lib/supabase';
import type { UpdateStockInput } from '../types';

export interface UpdateStockResponse {
  success: boolean;
  newQuantity?: number;
  error?: string;
}

/**
 * Update product stock quantity
 * Supports set, add, and subtract operations
 */
export async function updateStock(input: UpdateStockInput): Promise<UpdateStockResponse> {
  const { productId, variantId, quantity, operation, reason } = input;

  try {
    // Start by getting current stock
    let currentStock = 0;
    let table: 'products' | 'product_variants' = 'products';
    let id = productId;

    if (variantId) {
      // Update variant stock
      table = 'product_variants';
      id = variantId;
      
      const { data: variant, error: fetchError } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('id', variantId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch variant stock: ${fetchError.message}`);
      }

      currentStock = variant?.stock || 0;
    } else {
      // Update product stock
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch product stock: ${fetchError.message}`);
      }

      currentStock = product?.stock_quantity || 0;
    }

    // Calculate new stock
    let newStock = currentStock;
    switch (operation) {
      case 'set':
        newStock = quantity;
        break;
      case 'add':
        newStock = currentStock + quantity;
        break;
      case 'subtract':
        newStock = Math.max(0, currentStock - quantity);
        break;
    }

    // Update the stock
    const { error: updateError } = await supabase
      .from(table)
      .update({ 
        [table === 'products' ? 'stock_quantity' : 'stock']: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw new Error(`Failed to update stock: ${updateError.message}`);
    }

    // Log stock movement if reason provided
    if (reason) {
      await logStockMovement({
        productId,
        variantId,
        previousQuantity: currentStock,
        newQuantity: newStock,
        change: newStock - currentStock,
        reason,
      });
    }

    return {
      success: true,
      newQuantity: newStock,
    };
  } catch (error) {
    console.error('Update stock error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

interface StockMovementLog {
  productId: string;
  variantId?: string;
  previousQuantity: number;
  newQuantity: number;
  change: number;
  reason: string;
}

/**
 * Log stock movement for audit trail
 */
async function logStockMovement(log: StockMovementLog): Promise<void> {
  try {
    await supabase.from('stock_movements').insert({
      product_id: log.productId,
      variant_id: log.variantId,
      previous_quantity: log.previousQuantity,
      new_quantity: log.newQuantity,
      change: log.change,
      reason: log.reason,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Non-critical error, just log it
    console.warn('Failed to log stock movement:', error);
  }
}

/**
 * Bulk update stock for multiple products
 */
export async function bulkUpdateStock(
  updates: UpdateStockInput[]
): Promise<{ success: boolean; results: UpdateStockResponse[]; error?: string }> {
  try {
    const results = await Promise.all(
      updates.map((update) => updateStock(update))
    );

    const allSuccessful = results.every((r) => r.success);

    return {
      success: allSuccessful,
      results,
    };
  } catch (error) {
    console.error('Bulk update stock error:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get stock history for a product
 */
export async function getStockHistory(productId: string, variantId?: string) {
  try {
    let query = supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (variantId) {
      query = query.eq('variant_id', variantId);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      throw new Error(`Failed to fetch stock history: ${error.message}`);
    }

    return {
      success: true,
      history: data || [],
    };
  } catch (error) {
    console.error('Get stock history error:', error);
    return {
      success: false,
      history: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
