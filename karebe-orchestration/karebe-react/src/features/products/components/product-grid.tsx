import { useCallback } from 'react';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from './product-card';
import { useProductFilterStore } from '../stores/product-filters';
import type { ProductDisplay, ProductVariant } from '../types';

interface ProductGridProps {
  products: ProductDisplay[];
  isLoading?: boolean;
  onAddToCart?: (product: ProductDisplay, variant?: ProductVariant) => void;
  onQuickView?: (product: ProductDisplay) => void;
  skeletonCount?: number;
  emptyMessage?: string;
  showControls?: boolean;
}

/**
 * Product Grid Component
 * 
 * Displays products in a responsive grid or list layout with controls.
 * 
 * @example
 * ```tsx
 * <ProductGrid 
 *   products={products} 
 *   onAddToCart={handleAddToCart}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function ProductGrid({
  products,
  isLoading = false,
  onAddToCart,
  onQuickView,
  skeletonCount = 8,
  emptyMessage = 'No products found',
  showControls = true,
}: ProductGridProps) {
  const { viewMode, setViewMode, perPage, setPerPage } = useProductFilterStore();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {showControls && <div className="h-12" />}
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'flex flex-col gap-4'
          }
        >
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <ProductCardSkeleton key={index} layout={viewMode} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-24 h-24 rounded-full bg-brand-100 flex items-center justify-center mb-6">
          <SlidersHorizontal className="w-10 h-10 text-brand-400" />
        </div>
        <h3 className="text-xl font-display font-semibold text-brand-800 mb-2">
          {emptyMessage}
        </h3>
        <p className="text-brand-500 max-w-md">
          Try adjusting your filters or search terms to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      {showControls && (
        <div className="flex items-center justify-between py-4 border-b border-brand-100">
          <p className="text-sm text-brand-600">
            Showing <span className="font-medium text-brand-800">{products.length}</span> products
          </p>

          <div className="flex items-center gap-4">
            {/* Per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-500 hidden sm:inline">Show:</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="text-sm border border-brand-200 rounded-lg px-3 py-1.5 bg-white text-brand-700 focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center border border-brand-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-white text-brand-400 hover:text-brand-600'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-white text-brand-400 hover:text-brand-600'
                }`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'flex flex-col gap-4'
        }
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            layout={viewMode}
            onAddToCart={onAddToCart}
            onQuickView={onQuickView}
          />
        ))}
      </div>
    </div>
  );
}

interface ProductGridWithPaginationProps extends ProductGridProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Product Grid with Pagination
 */
export function ProductGridWithPagination({
  currentPage,
  totalPages,
  onPageChange,
  ...gridProps
}: ProductGridWithPaginationProps) {
  const getPageNumbers = useCallback(() => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  if (gridProps.products.length === 0) {
    return <ProductGrid {...gridProps} />;
  }

  return (
    <div className="space-y-6">
      <ProductGrid {...gridProps} showControls={false} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 border-t border-brand-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <span className="px-3 py-2 text-brand-400">...</span>
                ) : (
                  <Button
                    variant={currentPage === page ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    className="min-w-[40px]"
                  >
                    {page}
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
