import type { Address, OrderItem } from '@/types';

export type PaymentMethod = 'mpesa' | 'card' | 'cash_on_delivery' | 'bank_transfer';
export type DeliveryMethod = 'delivery' | 'pickup';

export interface CheckoutFormData {
  // Customer info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  
  // Delivery
  deliveryMethod: DeliveryMethod;
  address?: Address;
  branchId?: string;
  deliveryInstructions?: string;
  
  // Payment
  paymentMethod: PaymentMethod;
  mpesaPhone?: string;
  savePaymentMethod?: boolean;
  
  // Additional
  notes?: string;
  agreeToTerms: boolean;
}

export interface CheckoutSummary {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  itemCount: number;
}

export interface CreateOrderInput {
  customerProfileId?: string;
  customerName?: string;
  phone?: string;
  items: Array<{
    productId: string;
    productName?: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }>;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: Address;
  deliveryZoneId?: string;
  distanceKm?: number;
  branchId?: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  notes?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  paymentReference?: string;
  message?: string;
  requiresPayment?: boolean;
  paymentUrl?: string;
}

export interface PaymentStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  orderId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  paidAt?: string;
}
