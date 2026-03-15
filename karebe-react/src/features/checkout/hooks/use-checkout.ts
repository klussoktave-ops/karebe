import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createOrder, initiateMpesaPayment, checkPaymentStatus } from '../api/create-order';
import type { CreateOrderInput, CheckoutFormData } from '../types';
import { useCartStore } from '@/features/cart';
import type { CartItem as CartItemType } from '@/features/cart/types';

export function useCheckout() {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  
  // Get cart values from store
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);
  const total = useCartStore((state) => state.total);
  const tax = useCartStore((state) => state.tax);
  const deliveryFee = useCartStore((state) => state.deliveryFee);

  const orderMutation = useMutation({
    mutationFn: createOrder,
  });

  const processCheckout = useCallback(async (
    formData: CheckoutFormData,
    _cartItems: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      unitPrice: number;
    }>,
    customerProfileId?: string,
    deliveryZoneId?: string,
    distanceKm?: number
  ) => {
    // Use actual cart values instead of hardcoded 0
    const orderInput: CreateOrderInput = {
      customerProfileId,
      customerName: formData.firstName && formData.lastName 
        ? `${formData.firstName} ${formData.lastName}` 
        : undefined,
      phone: formData.phone,
      items: items.map((item: CartItemType) => ({
        productId: item.productId,
        productName: item.product?.name,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      deliveryMethod: formData.deliveryMethod,
      deliveryAddress: formData.deliveryMethod === 'delivery' ? formData.address : undefined,
      deliveryZoneId,
      distanceKm,
      branchId: formData.deliveryMethod === 'pickup' ? formData.branchId : undefined,
      paymentMethod: formData.paymentMethod,
      // Use actual cart values
      subtotal,
      tax,
      deliveryFee,
      total,
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
  }, [orderMutation, items, subtotal, total, tax, deliveryFee]);

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
