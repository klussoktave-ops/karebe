import { supabase } from '@/lib/supabase';
import type { CreateOrderInput, CreateOrderResponse } from '../types';

// Railway API URL
const ORCHESTRATION_API = import.meta.env.VITE_ORCHESTRATION_API_URL || 'https://karebe-orchestration-production.up.railway.app';

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
  try {
    // Call the checkout edge function
    const { data, error } = await supabase.functions.invoke('checkout', {
      body: {
        items: input.items,
        customer_profile_id: input.customerProfileId,
        delivery_method: input.deliveryMethod,
        delivery_address: input.deliveryAddress,
        branch_id: input.branchId,
        payment_method: input.paymentMethod,
        subtotal: input.subtotal,
        tax: input.tax,
        delivery_fee: input.deliveryFee,
        total: input.total,
        notes: input.notes,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      orderId: data.order_id,
      orderNumber: data.order_number,
      paymentReference: data.payment_reference,
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
