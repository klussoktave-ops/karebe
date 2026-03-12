import { useState } from 'react';
import { Minus, Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CartItem } from '../types';
import { useCartMutations } from '../hooks/use-cart-mutations';

interface CartItemProps {
  item: CartItem;
  customerId?: string;
  compact?: boolean;
}

/**
 * Cart Item Component
 * 
 * Displays a single cart item with quantity controls.
 * 
 * @example
 * ```tsx
 * <CartItem item={cartItem} customerId={user?.id} />
 * ```
 */
export function CartItem({ item, customerId, compact = false }: CartItemProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const { updateQuantity, removeFromCart, isUpdating, isRemoving: isDeleting } = useCartMutations(customerId);

  const product = item.product;
  const variant = item.variant;
  const displayName = variant ? `${product.name} - ${variant.volume}` : product.name;
  const image = product.images[0] || '/placeholder-product.png';
  const totalPrice = item.unitPrice * item.quantity;

  const handleUpdateQuantity = (newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity({ itemId: item.id, quantity: newQuantity, customerId });
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeFromCart({ itemId: item.id, customerId });
    } finally {
      setIsRemoving(false);
    }
  };

  if (compact) {
    return (
      <div className="flex gap-3 py-3 border-b border-brand-100 last:border-0">
        <img
          src={image}
          alt={product.name}
          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg bg-brand-50 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-brand-900 truncate">
            {product.name}
          </h4>
          {variant && (
            <p className="text-xs text-brand-500 mt-0.5">
              {variant.volume}
            </p>
          )}
          <p className="text-sm text-brand-600 mt-1">
            KES {item.unitPrice.toLocaleString()}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center border border-brand-200 rounded-lg">
              <button
                onClick={() => handleUpdateQuantity(item.quantity - 1)}
                disabled={isUpdating || item.quantity <= 1}
                className="p-1.5 hover:bg-brand-50 disabled:opacity-50"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center text-sm font-medium">
                {item.quantity}
              </span>
              <button
                onClick={() => handleUpdateQuantity(item.quantity + 1)}
                disabled={isUpdating}
                className="p-1.5 hover:bg-brand-50 disabled:opacity-50"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={handleRemove}
              disabled={isDeleting || isRemoving}
              className="text-brand-400 hover:text-error-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-medium text-brand-900">
            KES {totalPrice.toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 py-4 border-b border-brand-100 last:border-0">
      {/* Product Image */}
      <div className="relative">
        <img
          src={image}
          alt={product.name}
          className="w-24 h-24 object-cover rounded-xl bg-brand-50"
        />
        {variant && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-brand-800 text-white text-xs px-2 py-0.5 rounded-full">
            {variant.volume}
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium text-brand-900">
              {product.name}
            </h4>
            {variant && (
              <p className="text-sm text-brand-500 mt-0.5">
                {variant.volume}
              </p>
            )}
            <p className="text-sm text-brand-500 mt-1 flex items-center gap-1">
              <Package className="w-3 h-3" />
              {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
            </p>
          </div>
          <button
            onClick={handleRemove}
            disabled={isDeleting || isRemoving}
            className="text-brand-400 hover:text-error-500 transition-colors p-1"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Quantity and Price */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center border border-brand-200 rounded-xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUpdateQuantity(item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
              className="h-9 w-9"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-12 text-center font-medium">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUpdateQuantity(item.quantity + 1)}
              disabled={isUpdating}
              className="h-9 w-9"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-right">
            <p className="text-lg font-semibold text-brand-900">
              KES {totalPrice.toLocaleString()}
            </p>
            <p className="text-sm text-brand-500">
              KES {item.unitPrice.toLocaleString()} each
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
