import { useCallback } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProductFilterStore, useProductFilters, useProductFilterActions } from '../stores/product-filters';
import { useCategories } from '../hooks/use-products';

interface ProductFiltersProps {
  showSearch?: boolean;
  showCategory?: boolean;
  showSort?: boolean;
  showPriceRange?: boolean;
  className?: string;
}

/**
 * Product Filters Component
 * 
 * Provides filtering controls for the product catalog.
 * 
 * @example
 * ```tsx
 * <ProductFilters showSearch showCategory showSort />
 * ```
 */
export function ProductFilters({
  showSearch = true,
  showCategory = true,
  showSort = true,
  showPriceRange = false,
  className = '',
}: ProductFiltersProps) {
  const filters = useProductFilters();
  const actions = useProductFilterActions();
  const hasActiveFilters = useProductFilterStore((state) => state.hasActiveFilters());
  const activeFiltersCount = useProductFilterStore((state) => state.getActiveFiltersCount());
  const { data: categories } = useCategories();

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      actions.setSearch(e.target.value);
    },
    [actions]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main filter bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        {showSearch && (
          <div className="flex-1">
            <Input
              type="search"
              placeholder="Search products..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        )}

        {/* Category filter */}
        {showCategory && categories && (
          <select
            value={filters.categoryId || ''}
            onChange={(e) => actions.setCategory(e.target.value || undefined)}
            className="px-4 py-2.5 border border-brand-200 rounded-xl bg-white text-sm text-brand-700 focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}

        {/* Sort */}
        {showSort && (
          <select
            value={filters.sortBy || 'newest'}
            onChange={(e) => actions.setSortBy(e.target.value as typeof filters.sortBy)}
            className="px-4 py-2.5 border border-brand-200 rounded-xl bg-white text-sm text-brand-700 focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A-Z</option>
            <option value="name_desc">Name: Z-A</option>
          </select>
        )}

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.resetFilters}
            className="text-brand-500"
          >
            <X className="w-4 h-4 mr-1" />
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Price range filter */}
      {showPriceRange && (
        <div className="flex items-center gap-4 p-4 bg-brand-50 rounded-xl">
          <span className="text-sm font-medium text-brand-700">Price Range:</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.minPrice || ''}
              onChange={(e) =>
                actions.setPriceRange(
                  e.target.value ? Number(e.target.value) : undefined,
                  filters.maxPrice
                )
              }
              className="w-24"
              min={0}
            />
            <span className="text-brand-400">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxPrice || ''}
              onChange={(e) =>
                actions.setPriceRange(
                  filters.minPrice,
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="w-24"
              min={0}
            />
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-brand-500">Active filters:</span>
          
          {filters.search && (
            <FilterChip
              label={`Search: "${filters.search}"`}
              onRemove={() => actions.setSearch('')}
            />
          )}
          
          {filters.categoryId && categories && (
            <FilterChip
              label={`Category: ${categories.find((c) => c.id === filters.categoryId)?.name}`}
              onRemove={() => actions.setCategory(undefined)}
            />
          )}
          
          {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
            <FilterChip
              label={`Price: ${filters.minPrice || 0} - ${filters.maxPrice || '∞'}`}
              onRemove={() => actions.setPriceRange(undefined, undefined)}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 hover:text-brand-900"
        aria-label="Remove filter"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

/**
 * Mobile filter drawer trigger
 */
export function MobileFilterTrigger({ onClick }: { onClick: () => void }) {
  const activeFiltersCount = useProductFilterStore((state) => state.getActiveFiltersCount());

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full sm:w-auto"
    >
      <SlidersHorizontal className="w-4 h-4 mr-2" />
      Filters
      {activeFiltersCount > 0 && (
        <span className="ml-2 px-2 py-0.5 bg-brand-600 text-white rounded-full text-xs">
          {activeFiltersCount}
        </span>
      )}
    </Button>
  );
}
