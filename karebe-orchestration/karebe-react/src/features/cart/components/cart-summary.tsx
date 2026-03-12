import { ShoppingBag, X, Truck, Receipt, AlertCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '../hooks/use-cart';
import { useCartStore, useCartItemCount } from '../stores/cart-store';
import { formatPrice } from '@/lib/utils';
import { CallButton } from '@/features/orders/components/CallButton';
import { useEffect, useState } from 'react';
import { useShowPrices } from '@/features/settings/hooks/use-settings';

// Railway API URL for pricing
const ORCHESTRATION_API = import.meta.env.VITE_ORCHESTRATION_API_URL || 'https://karebe-orchestration-production.up.railway.app';

// Default values (fallback if API not available)
const DEFAULT_VAT_RATE = 0.16;
const DEFAULT_BASE_FEE = 300;
const DEFAULT_FREE_THRESHOLD = 5000;

interface PricingConfig {
  vatRate: number;
  baseDeliveryFee: number;
  freeDeliveryThreshold: number;
}

interface CartSummaryProps {
  onCheckout?: () => void;
  compact?: boolean;
  className?: string;
}

/**
 * Cart Summary Component
 * 
 * Displays cart totals, delivery info, and checkout button.
 * Used in cart page and checkout flow.
 * 
 * @example
 * ```tsx
 * <CartSummary onCheckout={() => navigate('/checkout')} />
 * ```
 */
export function CartSummary({ onCheckout, compact = false, className = '' }: CartSummaryProps) {
  const { subtotal, itemCount, items } = useCart();
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  
  // Check if prices should be shown
  const showPrices = useShowPrices();

  // Fetch pricing config
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    vatRate: DEFAULT_VAT_RATE,
    baseDeliveryFee: DEFAULT_BASE_FEE,
    freeDeliveryThreshold: DEFAULT_FREE_THRESHOLD
  });

  useEffect(() => {
    fetch(`${ORCHESTRATION_API}/api/pricing`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.data?.settings) {
          const settings = data.data.settings;
          setPricingConfig({
            vatRate: settings.vat_rate?.rate ?? DEFAULT_VAT_RATE,
            baseDeliveryFee: settings.base_delivery_fee?.amount ?? DEFAULT_BASE_FEE,
            freeDeliveryThreshold: settings.free_delivery_threshold?.amount ?? DEFAULT_FREE_THRESHOLD
          });
        }
      })
      .catch(console.error);
  }, []);

  // Calculate values using configurable settings
  const tax = subtotal * pricingConfig.vatRate;
  const isFreeDelivery = subtotal >= pricingConfig.freeDeliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0 : pricingConfig.baseDeliveryFee;
  const freeDeliveryRemaining = Math.max(0, pricingConfig.freeDeliveryThreshold - subtotal);
  // Use recalculated total based on fetched pricing config
  const total = subtotal + tax + deliveryFee;

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-brand-600">Subtotal ({itemCount} items)</span>
            <span className="font-medium text-brand-900">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-600">Delivery</span>
            <span className="font-medium text-brand-900">
              {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="font-semibold text-brand-900">Total</span>
            <span className="font-bold text-brand-900">{formatPrice(total)}</span>
          </div>
          <Button 
            fullWidth 
            onClick={onCheckout}
            disabled={items.length === 0}
          >
            Checkout
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`sticky top-4 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Items count */}
        <div className="flex items-center gap-2 text-brand-600">
          <ShoppingBag className="w-4 h-4" />
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </div>

        <Separator />

        {/* Cost breakdown */}
        <div className="space-y-2">
          {showPrices ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-brand-600">Subtotal</span>
                <span className="font-medium text-brand-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-600">Tax (16%)</span>
                <span className="font-medium text-brand-900">{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-600 flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  Delivery
                </span>
                <span className="font-medium text-brand-900">
                  {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                </span>
              </div>
            </>
          ) : (
            <div className="text-sm text-brand-500 italic">
              Contact us for pricing
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        {showPrices ? (
          <div className="flex justify-between">
            <span className="text-lg font-semibold text-brand-900">Total</span>
            <span className="text-2xl font-bold text-brand-900">{formatPrice(total)}</span>
          </div>
        ) : (
          <div className="text-center py-2">
            <span className="text-lg font-semibold text-brand-500 italic">
              Contact for total
            </span>
          </div>
        )}

        {/* Free delivery progress */}
        {freeDeliveryRemaining > 0 && (
          <div className="bg-brand-50 p-3 rounded-lg">
            <p className="text-sm text-brand-700">
              Add <span className="font-semibold">{formatPrice(freeDeliveryRemaining)}</span> more for 
              <span className="font-semibold"> FREE delivery</span>
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-3">
        <Button 
          fullWidth 
          size="lg"
          onClick={onCheckout}
          disabled={items.length === 0}
        >
          Proceed to Checkout
        </Button>
        
        {/* Call to Order Button */}
        <div className="w-full">
          <CallButton 
            phoneNumber="+254720123456" 
            className="w-full"
          />
        </div>
        
        <Button 
          variant="ghost" 
          fullWidth
          onClick={closeCart}
        >
          Continue Shopping
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Mini cart button/badge for header
 */
export function CartButton({ onClick }: { onClick?: () => void }) {
  const itemCount = useCartItemCount();
  const toggleCart = useCartStore((state) => state.toggleCart);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      toggleCart();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 text-brand-700 hover:text-brand-900 transition-colors"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <ShoppingBag className="w-6 h-6" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
}

/**
 * Cart drawer/sidebar component
 */
export function CartDrawer({ onCheckout }: { onCheckout?: () => void }) {
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={closeCart}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-brand-100">
          <h2 className="text-lg font-semibold text-brand-900">Your Cart</h2>
          <button 
            onClick={closeCart}
            className="p-2 hover:bg-brand-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Cart items list would go here */}
          <p className="text-center text-brand-500 py-8">Cart items coming soon</p>
        </div>

        <div className="border-t border-brand-100 p-4">
          <CartSummary compact onCheckout={onCheckout} />
        </div>
      </div>
    </>
  );
}
