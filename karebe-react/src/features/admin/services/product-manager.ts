import { supabase } from '@/lib/supabase';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock_quantity: number;
  image_url: string | null;
  unit_size: string | null;
  alcohol_content: number | null;
  brand: string | null;
  is_featured: boolean;
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
  stock_quantity: number;
  image_url?: string;
  unit_size?: string;
  alcohol_content?: number;
  brand?: string;
  is_featured?: boolean;
}

export class ProductManager {
  static async getProducts(filters?: ProductFilters): Promise<Product[]> {
    let query = supabase.from('products').select('*');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters?.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters?.inStock) {
      query = query.gt('stock_quantity', 0);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return data || [];
  }

  static async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return data;
  }

  static async createProduct(input: ProductCreateInput): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create product: No data returned');
    }

    return data;
  }

  static async updateProduct(id: string, updates: Partial<ProductCreateInput>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update product: No data returned');
    }

    return data;
  }

  static async deleteProduct(id: string): Promise<void> {
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

    if (!data) {
      throw new Error('Failed to update stock: No data returned');
    }

    return data;
  }

  static async uploadProductImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  }

  static async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .order('category');

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    const categories = [...new Set(data?.map(p => p.category))];
    return categories;
  }
}