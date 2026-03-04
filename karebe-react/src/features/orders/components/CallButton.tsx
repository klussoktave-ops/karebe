// =============================================================================
// Call Button Component
// Submits order when clicked and opens phone dialer
// =============================================================================

import { useState } from 'react';
import { Phone, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useCartStore } from '@/features/cart/stores/cart-store';
import { useBranchStore } from '@/features/branches/stores/branch-store';
import { submitCallOrder, CallOrderRequest } from '../api/call-order';

interface CallButtonProps {
  phoneNumber: string;
  className?: string;
}

export function CallButton({ phoneNumber, className }: CallButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { items, clearCart } = useCartStore();
  const { selectedBranch } = useBranchStore();

  const handleCall = async () => {
    if (items.length === 0) {
      setError('Your cart is empty. Please add items before calling.');
      return;
    }

    // Use default branch if none selected
    const branchId = selectedBranch?.id || 'main-branch';

    setIsSubmitting(true);
    setError(null);

    try {
      // Get customer info from localStorage (if previously entered)
      const customerPhone = localStorage.getItem('customer_phone') || '';
      const customerName = localStorage.getItem('customer_name') || '';
      const deliveryAddress = localStorage.getItem('delivery_address') || '';

      const request: CallOrderRequest = {
        customer_phone: customerPhone || 'PENDING_CALL',
        customer_name: customerName || undefined,
        delivery_address: deliveryAddress || 'PENDING_CALL',
        branch_id: branchId,
        items: items.map((item) => ({
          product_id: item.productId,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          variant: undefined,
        })),
      };

      const result = await submitCallOrder(request);

      if (result.success && result.data) {
        setOrderId(result.data.id);
        setShowSuccess(true);

        // Clear cart after successful submission
        clearCart();

        // Open phone dialer after short delay
        setTimeout(() => {
          window.location.href = `tel:${phoneNumber}`;
        }, 1500);
      } else {
        setError(result.error || 'Failed to submit order. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting order:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleCall}
        disabled={isSubmitting}
        className={`bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all ${className}`}
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Phone className="w-5 h-5 mr-2" />
            Call to Order
          </>
        )}
      </Button>

      {/* Success Dialog */}
      <Dialog
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Order Submitted!"
        size="md"
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <span className="font-semibold">Success</span>
        </div>
        <p className="mb-2">
          Your order has been submitted to the store.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Order ID: <span className="font-mono font-bold">{orderId?.slice(-8)}</span>
        </p>
        <p className="text-sm text-gray-500">
          We&apos;ll now connect you with the store. Your cart has been saved.
        </p>
      </Dialog>

      {/* Error Dialog */}
      <Dialog
        open={!!error}
        onClose={() => setError(null)}
        title="Error"
        size="sm"
      >
        <p className="text-red-500">{error}</p>
      </Dialog>
    </>
  );
}