import { useState, useRef } from 'react';
import { ShoppingCart, LogIn, Phone, CreditCard, LayoutDashboard, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/layout/container';
import { FloatingActions } from '@/components/layout/floating-actions';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/features/products/components/product-grid';
import { ProductFilters } from '@/features/products/components/product-filters';
import { useProducts } from '@/features/products/hooks/use-products';
import { useProductFilterStore, useProductFilters } from '@/features/products/stores/product-filters';
import { useCart } from '@/features/cart/hooks/use-cart';
import { useCartMutations } from '@/features/cart/hooks/use-cart-mutations';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getDashboardRoute } from '@/features/auth/utils/role-utils';
import type { ProductDisplay, ProductVariant } from '@/features/products/types';

/**
 * Customer Catalog Page
 * 
 * Main shopping page displaying products with filtering and cart functionality.
 */
export function CatalogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const filters = useProductFilters();
  const setPage = useProductFilterStore((state) => state.setPage);
  const { data, isLoading } = useProducts(filters);
  const { items: cartItems } = useCart(user?.id);
  const { addToCart } = useCartMutations(user?.id);
  const cartSectionRef = useRef<HTMLDivElement>(null);
  const [isCartHighlighted, setIsCartHighlighted] = useState(false);

  const handleAddToCart = async (product: ProductDisplay, variant?: ProductVariant) => {
    await addToCart({
      product,
      quantity: 1,
      variant,
    });
  };

  const handlePageChange = (page: number) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll to cart section and trigger highlight animation
  const scrollToCart = () => {
    cartSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Trigger highlight animation
    setIsCartHighlighted(true);
    setTimeout(() => setIsCartHighlighted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-brand-50">
      <Container>
        {/* Banner Image */}
        <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-8">
          <div className="aspect-[3/1] max-h-64 overflow-hidden rounded-b-2xl shadow-lg">
            <img 
              src="/assets/images/karebe_banner.png" 
              alt="Karebe Wines & Spirits" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Contact Info Bar */}
        <div className="bg-brand-800 text-white px-4 py-3 rounded-lg mb-8 flex flex-wrap items-center justify-center gap-6 shadow-md">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            <span className="font-medium">+254 724 721627</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <span className="font-medium">Till: 913 7883</span>
          </div>
        </div>

        <div className="py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-brand-900">
                Product Catalog
              </h1>
              <p className="text-brand-600 mt-1">
                Browse our collection of wines and spirits
              </p>
            </div>
            <Button
              variant="outline"
              onClick={scrollToCart}
              className="relative"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => user ? navigate(getDashboardRoute(user.role)) : navigate('/admin/login')}
              className="flex items-center gap-2"
            >
              {user ? (
                <>
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Login
                </>
              )}
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <ProductFilters showSearch showCategory showSort />
          </div>

          {/* Product Grid */}
          <ProductGrid
            products={data?.data || []}
            isLoading={isLoading}
            onAddToCart={handleAddToCart}
            skeletonCount={8}
          />

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => handlePageChange(filters.page! - 1)}
                disabled={filters.page === 1}
              >
                Previous
              </Button>
              <span className="text-brand-600">
                Page {filters.page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(filters.page! + 1)}
                disabled={filters.page === data.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Container>

      {/* Floating Action Buttons (includes cart button) */}
      <FloatingActions
        cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        isLoggedIn={!!user}
        userRole={user?.role}
        onAdminClick={() => navigate('/admin')}
        onRiderClick={() => navigate('/rider')}
        onLoginClick={() => navigate('/admin/login')}
      />

      {/* Cart Section - Main cart view */}
      <div 
        ref={cartSectionRef}
        id="cart-section"
        className={`py-8 bg-brand-50 transition-all duration-300 ${
          isCartHighlighted ? 'animate-cart-glow' : ''
        }`}
        tabIndex={-1}
        aria-label="Shopping cart"
      >
        <Container>
          {cartItems.length > 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-display font-bold text-brand-900 mb-4">
                Your Cart ({cartItems.length} items)
              </h2>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-brand-50 rounded-lg">
                    <img
                      src={item.product.images[0] || '/placeholder-product.png'}
                      alt={item.product.name}
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-brand-900 truncate">
                        {item.product.name}
                      </h3>
                      {item.variant && (
                        <p className="text-sm text-brand-500">{item.variant.volume}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-brand-900">
                        KES {(item.unitPrice * item.quantity).toLocaleString()}
                      </p>
                      <p className="text-sm text-brand-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between items-center">
                <div>
                  <p className="text-sm text-brand-600">Total</p>
                  <p className="text-2xl font-bold text-brand-900">
                    KES {cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate('/cart')}>
                    View Full Cart
                  </Button>
                  <Button onClick={() => navigate('/checkout')}>
                    Checkout
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-brand-300 mb-4" />
              <p className="text-brand-600">Your cart is empty</p>
              <p className="text-sm text-brand-500 mt-1">Add items to see them here</p>
            </div>
          )}
        </Container>
        
        {/* Quick Action Buttons for Cart Section */}
        <Container>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.location.href = 'tel:+254724721627'}
            >
              <Phone className="w-4 h-4" />
              Call to Order
            </Button>
            <Button
              variant="outline"
              className="gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              onClick={() => {
                const message = encodeURIComponent('Hi Karebe! I would like to inquire about my order.');
                window.open(`https://wa.me/254724721627?text=${message}`, '_blank');
              }}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            {user ? (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate(getDashboardRoute(user.role))}
              >
                <LayoutDashboard className="w-4 h-4" />
                {user.role === 'rider' ? 'Rider Portal' : 'Admin Dashboard'}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate('/admin/login')}
              >
                <LogIn className="w-4 h-4" />
                Admin/Rider Login
              </Button>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
}

export default CatalogPage;
