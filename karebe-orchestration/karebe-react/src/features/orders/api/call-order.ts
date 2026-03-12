// =============================================================================
// Call Order API
// Handles order submission when customer clicks "Call" button
// =============================================================================

import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, OrderStatusType } from '@/types';

export interface CallOrderRequest {
  customer_phone: string;
  customer_name?: string;
  delivery_address: string;
  delivery_notes?: string;
  branch_id: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    variant?: string;
  }>;
}

export interface CallOrderResponse {
  success: boolean;
  data?: Order;
  error?: string;
  message?: string;
}

/**
 * Submit order via call button
 * This creates an order in ORDER_SUBMITTED status
 */
export async function submitCallOrder(
  request: CallOrderRequest
): Promise<CallOrderResponse> {
  try {
    // Calculate total
    const totalAmount = request.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );

    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey(request);

    // Check for duplicate
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingOrder) {
      // Return existing order
      const { data: fullOrder } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', existingOrder.id)
        .single();

      return {
        success: true,
        data: fullOrder as Order,
        message: 'Order already submitted',
      };
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        status: OrderStatus.ORDER_SUBMITTED as OrderStatusType,
        customer_phone: request.customer_phone,
        customer_name: request.customer_name || null,
        delivery_address: request.delivery_address,
        delivery_notes: request.delivery_notes || null,
        branch_id: request.branch_id,
        total_amount: totalAmount,
        idempotency_key: idempotencyKey,
        metadata: {
          trigger_source: 'call_button',
          item_count: request.items.length,
        },
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return {
        success: false,
        error: orderError.message,
      };
    }

    // Create order items
    const orderItems = request.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      variant: item.variant || null,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Don't fail - order was created
    }

    // Fetch complete order with items
    const { data: fullOrder } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', order.id)
      .single();

    return {
      success: true,
      data: fullOrder as Order,
      message: 'Order submitted successfully',
    };
  } catch (error) {
    console.error('Error in submitCallOrder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate idempotency key from request
 */
function generateIdempotencyKey(request: CallOrderRequest): string {
  const data = `${request.customer_phone}:${request.branch_id}:${request.items.length}:${Date.now()}`;
  return btoa(data).substring(0, 64);
}