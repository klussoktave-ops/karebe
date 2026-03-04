import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CartItem } from '@/features/cart/components/cart-item';
import { CartSummary } from '@/features/cart/components/cart-summary';
import { useCart } from '@/features/cart/hooks/use-cart';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ShoppingBag } from 'lucide-react';

export function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, clearCart } = useCart(user?.id);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-50 py-16">
        <Container>
          <Card className="text-center py-16">
            <ShoppingBag className="w-16 h-16 mx-auto text-brand-300 mb-4" />
            <h1 className="text-2xl font-display font-bold text-brand-900 mb-2">
              Your Cart is Empty
            </h1>
            <p className="text-brand-600 mb-6">
              Browse our catalog to find amazing products
            </p>
            <Button onClick={() => navigate('/')}>
              Continue Shopping
            </Button>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50 py-8">
      <Container>
        <h1 className="text-3xl font-display font-bold text-brand-900 mb-8">
          Shopping Cart ({items.length} items)
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} customerId={user?.id} />
                ))}
              </CardContent>
            </Card>

            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={() => navigate('/')}>
                Continue Shopping
              </Button>
              <Button variant="ghost" onClick={clearCart}>
                Clear Cart
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <CartSummary onCheckout={() => navigate('/checkout')} />
          </div>
        </div>
      </Container>
    </div>
  );
}

export default CartPage;
