import { supabase } from '@/lib/supabase';
import { demoProducts, demoCategories } from '@/lib/demo-data';
import type { ProductFilters, ProductDisplay, ProductWithVariants, Category } from '../types';
import type { PaginatedResponse } from '@/types';
import type { SupabaseClient } from '@/lib/supabase';

// Check if Supabase is properly configured
// Handle both VITE_ and legacy formats
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
if (supabaseUrl.includes('=')) {
  supabaseUrl = supabaseUrl.split('=')[1] || '';
}
const isSupabaseConfigured = supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co');

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Transform demo product to ProductDisplay format
 */
function transformDemoProduct(demoProduct: typeof demoProducts[0]): ProductDisplay {
  const category = demoCategories.find(c => c.id === demoProduct.categoryId);
  const defaultVariant = demoProduct.variants[0];
  
  return {
    id: demoProduct.id,
    name: demoProduct.name,
    description: demoProduct.description,
    price: defaultVariant?.price ?? 0,
    compareAtPrice: defaultVariant?.comparePrice,
    categoryId: demoProduct.categoryId,
    images: demoProduct.images,
    stockQuantity: demoProduct.variants.reduce((sum, v) => sum + v.stock, 0),
    isAvailable: demoProduct.isActive,
    isVisible: demoProduct.isActive,
    tags: demoProduct.tags,
    createdAt: demoProduct.createdAt,
    updatedAt: demoProduct.createdAt,
    variants: demoProduct.variants.map(v => ({
      id: v.id,
      productId: demoProduct.id,
      volume: v.size,
      price: v.price,
      compareAtPrice: v.comparePrice,
      stock: v.stock,
      sku: v.sku,
      isDefault: v.id === defaultVariant?.id,
    })),
    categoryName: category?.name,
    isPopular: demoProduct.rating >= 4.5 && demoProduct.reviewCount > 100,
    isNewArrival: new Date(demoProduct.createdAt) > new Date('2024-01-01'),
    isOnSale: demoProduct.variants.some(v => v.comparePrice !== undefined),
    averageRating: demoProduct.rating,
    reviewCount: demoProduct.reviewCount,
  };
}

/**
 * Get demo products with filtering and pagination
 */
async function getDemoProducts(filters: ProductFilters): Promise<PaginatedResponse<ProductDisplay>> {
  // Simulate network delay
  await delay(300);

  const {
    categoryId,
    search,
    minPrice,
    maxPrice,
    inStock,
    isVisible = true,
    sortBy = 'newest',
    page = 1,
    perPage = 20,
  } = filters;

  let products = demoProducts
    .filter(p => p.isActive || !isVisible)
    .map(transformDemoProduct);

  // Apply category filter
  if (categoryId) {
    products = products.filter(p => p.categoryId === categoryId);
  }

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  }

  // Apply stock filter
  if (inStock !== undefined) {
    products = products.filter(p => {
      const hasStock = p.variants.some(v => v.stock > 0);
      return inStock ? hasStock : !hasStock;
    });
  }

  // Apply price filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    products = products.filter(p => 
      p.variants.some(v => {
        if (minPrice !== undefined && v.price < minPrice) return false;
        if (maxPrice !== undefined && v.price > maxPrice) return false;
        return true;
      })
    );
  }

  // Apply sorting
  switch (sortBy) {
    case 'price_asc':
      products.sort((a, b) => {
        const priceA = Math.min(...a.variants.map(v => v.price));
        const priceB = Math.min(...b.variants.map(v => v.price));
        return priceA - priceB;
      });
      break;
    case 'price_desc':
      products.sort((a, b) => {
        const priceA = Math.max(...a.variants.map(v => v.price));
        const priceB = Math.max(...b.variants.map(v => v.price));
        return priceB - priceA;
      });
      break;
    case 'name_asc':
      products.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name_desc':
      products.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'newest':
    default:
      products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }

  const total = products.length;
  const totalPages = Math.ceil(total / perPage);
  const from = (page - 1) * perPage;
  const paginatedProducts = products.slice(from, from + perPage);

  return {
    data: paginatedProducts,
    total,
    page,
    perPage,
    totalPages,
  };
}

/**
 * Fetch products with filters, pagination, and sorting
 */
export async function getProducts(
  filters: ProductFilters = {}
): Promise<PaginatedResponse<ProductDisplay>> {
  // Use demo data if Supabase is not configured or client is null
  if (!isSupabaseConfigured || !supabase) {
    return getDemoProducts(filters);
  }

  const supabaseClient = supabase as SupabaseClient;
  
  const {
    categoryId,
    search,
    minPrice,
    maxPrice,
    inStock,
    isVisible = true,
    sortBy = 'newest',
    page = 1,
    perPage = 20,
  } = filters;

  // Build the query
  let query = supabase
    .from('products')
    .select(
      '*, category:categories(*), variants:product_variants(*)',
      { count: 'exact' }
    );

  // Apply visibility filter (for customer view)
  if (isVisible !== undefined) {
    query = query.eq('is_visible', isVisible);
  }

  // Apply category filter
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  // Apply search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Apply stock filter
  if (inStock !== undefined) {
    if (inStock) {
      query = query.gt('stock_quantity', 0);
    } else {
      query = query.lte('stock_quantity', 0);
    }
  }

  // Apply availability filter
  query = query.eq('is_available', true);

  // Apply sorting
  switch (sortBy) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'name_asc':
      query = query.order('name', { ascending: true });
      break;
    case 'name_desc':
      query = query.order('name', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Apply pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    // Fall back to demo data on error
    console.warn('Falling back to demo data due to Supabase error');
    return getDemoProducts(filters);
  }

  // If no data returned, fall back to demo data
  if (!data || data.length === 0) {
    console.warn('No products found in Supabase, falling back to demo data');
    return getDemoProducts(filters);
  }

  // Post-process for price range filtering (on variants if needed)
  let products = data || [];
  
  if (minPrice !== undefined || maxPrice !== undefined) {
    products = products.filter((product) => {
      const variants = product.variants || [];
      if (variants.length === 0) {
        const price = product.price;
        if (minPrice !== undefined && price < minPrice) return false;
        if (maxPrice !== undefined && price > maxPrice) return false;
        return true;
      }
      
      // Check if any variant is within price range
      return variants.some((variant: { price: number }) => {
        if (minPrice !== undefined && variant.price < minPrice) return false;
        if (maxPrice !== undefined && variant.price > maxPrice) return false;
        return true;
      });
    });
  }

  // Transform to ProductDisplay
  const transformedProducts: ProductDisplay[] = products.map((product) => ({
    ...product,
    variants: product.variants || [],
    categoryName: product.category?.name,
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / perPage);

  return {
    data: transformedProducts,
    total,
    page,
    perPage,
    totalPages,
  };
}

/**
 * Fetch a single product by ID with all details
 */
export async function getProductById(id: string): Promise<ProductDisplay> {
  // Use demo data if Supabase is not configured or client is null
  if (!isSupabaseConfigured || !supabase) {
    await delay(300);
    const demoProduct = demoProducts.find(p => p.id === id);
    if (!demoProduct) {
      throw new Error('Product not found');
    }
    return transformDemoProduct(demoProduct);
  }

  const supabaseClient = supabase as SupabaseClient;
  const { data, error } = await supabaseClient
    .from('products')
    .select('*, category:categories(*), variants:product_variants(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    throw new Error(`Failed to fetch product: ${error.message}`);
  }

  if (!data) {
    throw new Error('Product not found');
  }

  return {
    ...data,
    variants: data.variants || [],
    categoryName: data.category?.name,
  };
}

/**
 * Fetch all categories
 */
export async function getCategories(): Promise<Category[]> {
  // Use demo data if Supabase is not configured or client is null
  if (!isSupabaseConfigured || !supabase) {
    await delay(300);
    return demoCategories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      sortOrder: c.sortOrder,
    }));
  }

  const supabaseClient = supabase as SupabaseClient;
  const { data, error } = await supabaseClient
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    // Fall back to demo data on error
    console.warn('Falling back to demo categories due to Supabase error');
    return demoCategories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      sortOrder: c.sortOrder,
    }));
  }

  // If no data returned, fall back to demo data
  if (!data || data.length === 0) {
    console.warn('No categories found in Supabase, falling back to demo data');
    return demoCategories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      sortOrder: c.sortOrder,
    }));
  }

  return data;
}

/**
 * Fetch featured/promoted products
 */
export async function getFeaturedProducts(limit: number = 8): Promise<ProductDisplay[]> {
  // Use demo data if Supabase is not configured or client is null
  if (!isSupabaseConfigured || !supabase) {
    await delay(300);
    return demoProducts
      .filter(p => p.isFeatured && p.isActive)
      .slice(0, limit)
      .map(transformDemoProduct);
  }

  const supabaseClient = supabase as SupabaseClient;
  const { data, error } = await supabaseClient
    .from('products')
    .select('*, category:categories(*), variants:product_variants(*)')
    .eq('is_visible', true)
    .eq('is_available', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching featured products:', error);
    // Fall back to demo data on error
    console.warn('Falling back to demo featured products due to Supabase error');
    return demoProducts
      .filter(p => p.isFeatured && p.isActive)
      .slice(0, limit)
      .map(transformDemoProduct);
  }

  // If no data returned, fall back to demo data
  if (!data || data.length === 0) {
    console.warn('No featured products found in Supabase, falling back to demo data');
    return demoProducts
      .filter(p => p.isFeatured && p.isActive)
      .slice(0, limit)
      .map(transformDemoProduct);
  }

  return data.map((product) => ({
    ...product,
    variants: product.variants || [],
    categoryName: product.category?.name,
  }));
}
