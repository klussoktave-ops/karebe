import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
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
import { CartSummary } from '@/features/cart/components/cart-summary';
import { FloatingCartSummary } from '@/components/cart/floating-cart-summary';
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
  const { toggleCart, items: cartItems } = useCart(user?.id);
  const { addToCart } = useCartMutations(user?.id);

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

  return (
    <div className="min-h-screen bg-brand-50">
      <Container>
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
              onClick={toggleCart}
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

      {/* Floating Cart Summary */}
      <FloatingCartSummary autoShow={true} autoHideDelay={5000} />

      {/* Floating Action Buttons */}
      <FloatingActions
        cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        isLoggedIn={!!user}
        userRole={user?.role}
        onAdminClick={() => navigate('/admin')}
        onRiderClick={() => navigate('/rider')}
        onLoginClick={() => navigate('/admin/login')}
      />

      {/* Cart Drawer */}
      <CartSummary />
    </div>
  );
}

export default CatalogPage;
