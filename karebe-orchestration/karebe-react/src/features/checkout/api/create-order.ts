import { supabase } from '@/lib/supabase';
import type { CreateOrderInput, CreateOrderResponse } from '../types';

// Railway API URL
const ORCHESTRATION_API = import.meta.env.VITE_ORCHESTRATION_API_URL || 'https://karebe-orchestration-production.up.railway.app';

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
  try {
    // Call the Railway orchestration API
    const response = await fetch(`${ORCHESTRATION_API}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_phone: input.phone || input.customerPhone || '',
        customer_name: input.customerName || null,
        delivery_address: input.deliveryAddress?.street || '',
        delivery_notes: input.notes || null,
        branch_id: input.branchId || null,
        // Pass delivery and pricing info
        delivery_fee: input.deliveryFee || 0,
        delivery_zone_id: input.deliveryZoneId || null,
        distance_km: input.distanceKm || null,
        tax: input.tax || 0,
        total: input.total || 0,
        // Items
        items: input.items.map(item => ({
          product_id: item.productId,
          product_name: item.productName || '',
          quantity: item.quantity,
          unit_price: item.unitPrice,
          variant: item.variantId || null,
        })),
        trigger_source: 'cart_checkout',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || data.error || 'Failed to create order');
    }

    return {
      success: true,
      orderId: data.data?.id,
      orderNumber: data.data?.order_number,
      paymentReference: data.data?.payment_reference,
      requiresPayment: data.requires_payment,
      paymentUrl: data.payment_url,
    };
  } catch (error) {
    console.error('Create order error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create order',
    };
  }
}

export async function initiateMpesaPayment(
  orderId: string,
  phoneNumber: string,
  amount: number
): Promise<{ success: boolean; checkoutRequestId?: string; message?: string }> {
  try {
    const response = await fetch(`${ORCHESTRATION_API}/api/payments/daraja/stkpush`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        phone_number: phoneNumber,
        amount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'M-Pesa payment initiation failed');
    }

    return {
      success: true,
      checkoutRequestId: data.checkout_request_id,
    };
  } catch (error) {
    console.error('M-Pesa payment error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

export async function checkPaymentStatus(orderId: string): Promise<{
  status: 'pending' | 'completed' | 'failed';
  message?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('payment_status')
      .eq('id', orderId)
      .single();

    if (error) throw error;

    return {
      status: data.payment_status === 'completed' ? 'completed' : 
              data.payment_status === 'failed' ? 'failed' : 'pending',
    };
  } catch (error) {
    console.error('Check payment status error:', error);
    return { status: 'pending' };
  }
}
