import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProductFilters, ProductVisibility } from '../types';

interface ProductFilterState extends ProductFilters {
  // UI state
  viewMode: 'grid' | 'list';
  visibility: ProductVisibility;
  selectedBranchId?: string;
  
  // Actions
  setCategory: (categoryId: string | undefined) => void;
  setSearch: (search: string) => void;
  setPriceRange: (min?: number, max?: number) => void;
  setInStock: (inStock: boolean | undefined) => void;
  setSortBy: (sortBy: ProductFilters['sortBy']) => void;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setVisibility: (visibility: ProductVisibility) => void;
  setSelectedBranch: (branchId: string | undefined) => void;
  resetFilters: () => void;
  
  // Computed
  hasActiveFilters: () => boolean;
  getActiveFiltersCount: () => number;
}

const defaultFilters: ProductFilters = {
  categoryId: undefined,
  search: '',
  minPrice: undefined,
  maxPrice: undefined,
  inStock: undefined,
  isVisible: true,
  sortBy: 'newest',
  page: 1,
  perPage: 20,
};

export const useProductFilterStore = create<ProductFilterState>()(
  persist(
    (set, get) => ({
      ...defaultFilters,
      viewMode: 'grid',
      visibility: 'visible',
      selectedBranchId: undefined,

      setCategory: (categoryId) => set({ 
        categoryId, 
        page: 1 // Reset to first page on filter change
      }),
      
      setSearch: (search) => set({ 
        search, 
        page: 1 
      }),
      
      setPriceRange: (minPrice, maxPrice) => set({ 
        minPrice, 
        maxPrice, 
        page: 1 
      }),
      
      setInStock: (inStock) => set({ 
        inStock, 
        page: 1 
      }),
      
      setSortBy: (sortBy) => set({ sortBy }),
      
      setPage: (page) => set({ page }),
      
      setPerPage: (perPage) => set({ perPage, page: 1 }),
      
      setViewMode: (viewMode) => set({ viewMode }),
      
      setVisibility: (visibility) => {
        const isVisible = visibility === 'visible' ? true : 
                         visibility === 'hidden' ? false : undefined;
        set({ visibility, isVisible, page: 1 });
      },
      
      setSelectedBranch: (selectedBranchId) => set({ 
        selectedBranchId, 
        page: 1 
      }),
      
      resetFilters: () => set({
        ...defaultFilters,
        viewMode: get().viewMode, // Preserve view mode
        visibility: 'visible',
        selectedBranchId: get().selectedBranchId, // Preserve branch selection
      }),
      
      hasActiveFilters: () => {
        const state = get();
        return !!(
          state.categoryId ||
          state.search ||
          state.minPrice !== undefined ||
          state.maxPrice !== undefined ||
          state.inStock !== undefined
        );
      },
      
      getActiveFiltersCount: () => {
        const state = get();
        let count = 0;
        if (state.categoryId) count++;
        if (state.search) count++;
        if (state.minPrice !== undefined || state.maxPrice !== undefined) count++;
        if (state.inStock !== undefined) count++;
        return count;
      },
    }),
    {
      name: 'karebe-product-filters',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        viewMode: state.viewMode,
        perPage: state.perPage,
        sortBy: state.sortBy,
        visibility: state.visibility,
        selectedBranchId: state.selectedBranchId,
      }),
    }
  )
);

// Selector hooks
export const useProductFilters = () => useProductFilterStore((state) => ({
  categoryId: state.categoryId,
  search: state.search,
  minPrice: state.minPrice,
  maxPrice: state.maxPrice,
  inStock: state.inStock,
  isVisible: state.isVisible,
  sortBy: state.sortBy,
  page: state.page,
  perPage: state.perPage,
}));

export const useProductFilterActions = () => useProductFilterStore((state) => ({
  setCategory: state.setCategory,
  setSearch: state.setSearch,
  setPriceRange: state.setPriceRange,
  setInStock: state.setInStock,
  setSortBy: state.setSortBy,
  setPage: state.setPage,
  setPerPage: state.setPerPage,
  resetFilters: state.resetFilters,
}));

export const useProductViewMode = () => useProductFilterStore((state) => state.viewMode);
export const useProductVisibility = () => useProductFilterStore((state) => state.visibility);
export const useSelectedBranchFilter = () => useProductFilterStore((state) => state.selectedBranchId);
