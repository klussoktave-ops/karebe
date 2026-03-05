/**
 * Floating Cart Summary
 * Shows a summary card that floats up from bottom when items are added
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingCart, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCartStore } from '@/features/cart/stores/cart-store';

interface FloatingCartSummaryProps {
  autoShow?: boolean;
  autoHideDelay?: number;
}

export function FloatingCartSummary({ 
  autoShow = true, 
  autoHideDelay = 5000 
}: FloatingCartSummaryProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { items, getTotal, getItemCount } = useCartStore();

  // Show when items are added
  useEffect(() => {
    if (autoShow && items.length > 0 && !isDismissed) {
      setIsVisible(true);
      
      // Auto hide after delay
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [items.length, autoShow, autoHideDelay, isDismissed]);

  // Reset dismissed state when cart is cleared
  useEffect(() => {
    if (items.length === 0) {
      setIsDismissed(false);
    }
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div 
      className={`fixed bottom-24 left-4 md:left-4 md:right-auto md:w-96 z-70 transition-all duration-300 ${
        isVisible ? 'animate-slide-up' : 'animate-slide-down pointer-events-none'
      }`}
    >
      <Card className="bg-white shadow-2xl border-2 border-brand-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-brand-50 border-b border-brand-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-brand-600" />
            <span className="font-semibold text-brand-900">
              Cart Summary ({getItemCount()} items)
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setIsVisible(false);
              setIsDismissed(true);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Items Preview */}
        <div className="p-3 max-h-32 overflow-y-auto">
          {items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex justify-between items-center py-1 text-sm">
              <span className="truncate flex-1">{item.product.name}</span>
              <span className="text-gray-500 ml-2">x{item.quantity}</span>
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-xs text-gray-500 py-1">
              +{items.length - 3} more items...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border-t">
          <div>
            <span className="text-sm text-gray-500">Total: </span>
            <span className="font-bold text-lg">KES {getTotal().toLocaleString()}</span>
          </div>
          <Link to="/cart" onClick={() => setIsVisible(false)}>
            <Button size="sm" className="gap-1">
              View Cart
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
