import { supabase } from '@/lib/supabase';

// Generate UUID for product IDs
function generateProductId(): string {
  return 'prod-' + crypto.randomUUID().substring(0, 8);
}

// Category mapping - frontend labels to database IDs
const CATEGORY_MAP: Record<string, string> = {
  'Wine': 'cat-wines',
  'Whisky': 'cat-spirits',
  'Whiskey': 'cat-spirits',
  'Vodka': 'cat-spirits',
  'Gin': 'cat-spirits',
  'Rum': 'cat-spirits',
  'Brandy': 'cat-spirits',
  'Tequila': 'cat-spirits',
  'Spirit': 'cat-spirits',
  'Spirits': 'cat-spirits',
  'Beer': 'cat-beers',
  'Champagne': 'cat-champagne',
  'Cider': 'cat-ciders',
  'Ciders': 'cat-ciders',
  'Mixers': 'cat-mixers',
  'Ready to Drink': 'cat-mixers',
  'Non-Alcoholic': 'cat-mixers',
  'Soft Drink': 'cat-mixers',
};

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  category_name?: string;
  stock_quantity: number;
  image: string | null;
  image_url?: string;
  unit_size: string | null;
  alcohol_content: number | null;
  is_featured: boolean;
  is_available: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface ProductCreateInput {
  name: string;
  description?: string;
  price: number;
  category: string;
  stock_quantity?: number;
  image_url?: string;
  unit_size?: string;
  alcohol_content?: number;
  is_featured?: boolean;
}

export class ProductManager {
  /**
   * Convert frontend category label to database category_id
   */
  static getCategoryId(categoryLabel: string): string {
    return CATEGORY_MAP[categoryLabel] || 'cat-mixers';
  }

  /**
   * Get category label from category_id
   */
  static getCategoryLabel(categoryId: string | null): string {
    const entry = Object.entries(CATEGORY_MAP).find(([_, id]) => id === categoryId);
    return entry ? entry[0] : 'Unknown';
  }
  static async getProducts(filters?: ProductFilters): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });

    if (filters?.category) {
      const categoryId = this.getCategoryId(filters.category);
      query = query.eq('category_id', categoryId);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters?.search}%`);
    }

    if (filters?.minPrice !== undefined) {
      query = query.gte('price', filters?.minPrice);
    }

    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters?.maxPrice);
    }

    if (filters?.inStock) {
      query = query.gt('stock_quantity', 0);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    // Map category_id to category_name for frontend display
    return (data || []).map(product => ({
      ...product,
      category: product.categories?.name || 'Unknown',
      category_name: product.categories?.name || 'Unknown',
      image_url: product.image,
    }));
  }

  static async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return {
      ...data,
      category: data.categories?.name || 'Unknown',
      category_name: data.categories?.name || 'Unknown',
      image_url: data.image,
    };
  }

  static async createProduct(input: ProductCreateInput): Promise<Product> {
    const categoryId = this.getCategoryId(input.category);
    const newProductId = generateProductId();
    
    // Create the product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        id: newProductId,
        name: input.name,
        description: input.description || null,
        price: input.price,
        category_id: categoryId,
        image: input.image_url || null,
        stock_quantity: input.stock_quantity || 0,
        is_featured: input.is_featured || false,
        is_available: true,
        is_visible: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (productError) {
      throw new Error(`Failed to create product: ${productError.message}`);
    }

    // If unit_size is provided, create a product variant
    if (input.unit_size) {
      const { error: variantError } = await supabase
        .from('product_variants')
        .insert({
          id: `${product.id}-var-${Date.now()}`,
          product_id: product.id,
          volume: input.unit_size,
          price: input.price,
          stock: input.stock_quantity || 0,
          is_default: true,
          created_at: new Date().toISOString(),
        });

      if (variantError) {
        console.error('Failed to create variant:', variantError.message);
      }
    }

    return {
      ...product,
      category: input.category,
      category_name: input.category,
      image_url: product.image,
    };
  }

  static async updateProduct(id: string, updates: Partial<ProductCreateInput>): Promise<Product> {
    // Build update object with proper database field names
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.stock_quantity !== undefined) dbUpdates.stock_quantity = updates.stock_quantity;
    if (updates.is_featured !== undefined) dbUpdates.is_featured = updates.is_featured;
    if (updates.image_url !== undefined) dbUpdates.image = updates.image_url;
    if (updates.category !== undefined) dbUpdates.category_id = this.getCategoryId(updates.category);

    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select('*, categories(name)')
      .single();

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    return {
      ...data,
      category: data.categories?.name || 'Unknown',
      category_name: data.categories?.name || 'Unknown',
      image_url: data.image,
    };
  }

  static async deleteProduct(id: string): Promise<void> {
    // First delete variants
    const { error: variantError } = await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', id);

    if (variantError) {
      console.error('Failed to delete variants:', variantError.message);
    }

    // Then delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  static async updateStock(id: string, quantity: number): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        stock_quantity: quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update stock: ${error.message}`);
    }

    return { ...data, image_url: data.image };
  }

  static async uploadProductImage(file: File): Promise<string> {
    console.log('[ProductManager] Starting image upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    console.log('[ProductManager] Upload path:', filePath);

    // Check if Supabase is available
    if (!supabase) {
      console.warn('[ProductManager] Supabase not initialized - using demo mode');
      // Fallback for demo mode: convert to data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          console.log('[ProductManager] Demo mode: converted to data URL');
          resolve(reader.result as string);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    }

    // Check bucket existence
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('[ProductManager] Bucket list error:', bucketError);
      throw new Error(`Storage error: ${bucketError.message}`);
    }

    const bucketExists = buckets?.some(b => b.name === 'product_images');
    if (!bucketExists) {
      console.error('[ProductManager] Bucket not found! Available:', buckets?.map(b => b.name));
      throw new Error('Storage bucket "product_images" does not exist. Create it in Supabase Dashboard > Storage.');
    }

    console.log('[ProductManager] Uploading to bucket...');
    const { error: uploadError } = await supabase.storage
      .from('product_images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('[ProductManager] Upload failed:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    console.log('[ProductManager] Upload successful, getting public URL...');
    const { data: { publicUrl } } = supabase.storage
      .from('product_images')
      .getPublicUrl(filePath);

    console.log('[ProductManager] Public URL:', publicUrl);
    return publicUrl;
  }

  /**
   * Upload multiple images
   */
  static async uploadMultipleImages(files: File[]): Promise<string[]> {
    console.log('[ProductManager] Starting multiple image upload:', {
      count: files.length,
      files: files.map(f => ({ name: f.name, size: f.size })),
    });

    const results: string[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const url = await this.uploadProductImage(files[i]);
        results.push(url);
        console.log(`[ProductManager] Uploaded ${i + 1}/${files.length}:`, url);
      } catch (error) {
        console.error(`[ProductManager] Failed to upload ${files[i].name}:`, error);
        throw error;
      }
    }

    console.log('[ProductManager] All uploads complete:', { total: results.length });
    return results;
  }

  /**
   * Validate image URL - test if image is accessible
   */
  static async validateImageUrl(url: string): Promise<{ valid: boolean; error?: string; width?: number; height?: number }> {
    console.log('[ProductManager] Validating image URL:', url);

    // Handle data URLs
    if (url.startsWith('data:')) {
      console.log('[ProductManager] Data URL - valid by default');
      return { valid: true };
    }

    // If no Supabase, just try loading
    if (!supabase) {
      console.log('[ProductManager] No Supabase - testing with Image object');
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          console.log('[ProductManager] Image loaded:', { width: img.width, height: img.height });
          resolve({ valid: true, width: img.width, height: img.height });
        };
        img.onerror = () => {
          console.error('[ProductManager] Image load failed');
          resolve({ valid: false, error: 'Failed to load image' });
        };
        img.src = url;
      });
    }

    // For Supabase URLs, verify bucket and path
    try {
      const pathParts = url.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      console.log('[ProductManager] Checking Supabase file:', fileName);
      
      const { data, error } = await supabase.storage
        .from('product_images')
        .download(fileName);

      if (error) {
        console.error('[ProductManager] Download check failed:', error);
        return { valid: false, error: error.message };
      }

      console.log('[ProductManager] Download check successful');
      return { valid: true };
    } catch (err) {
      console.error('[ProductManager] Validation error:', err);
      return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Get all categories from the database
   */
  static async getCategories(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('sort_order');

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get product variants for a product
   */
  static async getProductVariants(productId: string): Promise<{
    id: string;
    volume: string;
    price: number;
    stock: number;
    is_default: boolean;
  }[]> {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('created_at');

    if (error) {
      throw new Error(`Failed to fetch variants: ${error.message}`);
    }

    return data || [];
  }
}