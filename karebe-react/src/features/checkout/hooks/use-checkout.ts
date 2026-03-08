import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createOrder, initiateMpesaPayment, checkPaymentStatus } from '../api/create-order';
import type { CreateOrderInput, CheckoutFormData } from '../types';

export function useCheckout() {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');

  const orderMutation = useMutation({
    mutationFn: createOrder,
  });

  const processCheckout = useCallback(async (
    formData: CheckoutFormData,
    cartItems: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
    }>,
    customerProfileId?: string
  ) => {
    const orderInput: CreateOrderInput = {
      customerProfileId,
      items: cartItems,
      deliveryMethod: formData.deliveryMethod,
      deliveryAddress: formData.deliveryMethod === 'delivery' ? formData.address : undefined,
      branchId: formData.deliveryMethod === 'pickup' ? formData.branchId : undefined,
      paymentMethod: formData.paymentMethod,
      subtotal: 0, // Calculate from cart
      tax: 0,
      deliveryFee: 0,
      total: 0,
      notes: formData.notes,
    };

    const result = await orderMutation.mutateAsync(orderInput);

    if (result.success && result.orderId) {
      // Handle M-Pesa payment
      if (formData.paymentMethod === 'mpesa' && formData.mpesaPhone) {
        setPaymentStatus('processing');
        const paymentResult = await initiateMpesaPayment(
          result.orderId,
          formData.mpesaPhone,
          orderInput.total
        );

        if (!paymentResult.success) {
          setPaymentStatus('failed');
          return { ...result, paymentError: paymentResult.message };
        }

        // Poll for payment status
        return await pollPaymentStatus(result.orderId, result);
      }
    }

    return result;
  }, [orderMutation]);

  const pollPaymentStatus = async (
    orderId: string,
    orderResult: Awaited<ReturnType<typeof createOrder>>
  ): Promise<typeof orderResult> => {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const status = await checkPaymentStatus(orderId);

      if (status.status === 'completed') {
        setPaymentStatus('completed');
        return { ...orderResult, success: true };
      }

      if (status.status === 'failed') {
        setPaymentStatus('failed');
        return { ...orderResult, success: false, message: 'Payment failed' };
      }

      attempts++;
    }

    // Timeout - payment still pending
    return orderResult;
  };

  return {
    processCheckout,
    isProcessing: orderMutation.isPending || paymentStatus === 'processing',
    paymentStatus,
    orderError: orderMutation.error,
  };
}
