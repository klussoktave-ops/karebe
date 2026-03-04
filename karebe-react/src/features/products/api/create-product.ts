import { supabase } from '@/lib/supabase';
import type { CreateProductInput, ProductWithVariants, ProductVariant } from '../types';

export interface CreateProductResponse {
  success: boolean;
  product?: ProductWithVariants;
  error?: string;
}

/**
 * Create a new product with optional variants
 */
export async function createProduct(
  input: CreateProductInput
): Promise<CreateProductResponse> {
  try {
    // Start a transaction-like operation
    
    // 1. Create the main product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: input.name,
        description: input.description,
        category_id: input.categoryId,
        images: input.images,
        is_available: input.isAvailable,
        is_visible: input.isVisible,
        weight: input.weight,
        dimensions: input.dimensions,
        tags: input.tags,
        // Calculate default price and stock from variants or set defaults
        price: input.variants?.[0]?.price || 0,
        stock_quantity: input.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (productError) {
      throw new Error(`Failed to create product: ${productError.message}`);
    }

    // 2. Create variants if provided
    let variants: ProductVariant[] = [];
    if (input.variants && input.variants.length > 0) {
      const variantsData = input.variants.map((variant) => ({
        product_id: product.id,
        volume: variant.volume,
        price: variant.price,
        compare_at_price: variant.compareAtPrice,
        stock: variant.stock,
        sku: variant.sku || `${product.id}-${variant.volume.toLowerCase().replace(/\s+/g, '-')}`,
        is_default: variant.isDefault,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data: createdVariants, error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantsData)
        .select();

      if (variantsError) {
        // Attempt to roll back by deleting the product
        await supabase.from('products').delete().eq('id', product.id);
        throw new Error(`Failed to create variants: ${variantsError.message}`);
      }

      variants = createdVariants || [];
    }

    return {
      success: true,
      product: {
        ...product,
        variants,
      },
    };
  } catch (error) {
    console.error('Create product error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  id: string,
  input: Partial<CreateProductInput>
): Promise<CreateProductResponse> {
  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
    if (input.images !== undefined) updateData.images = input.images;
    if (input.isAvailable !== undefined) updateData.is_available = input.isAvailable;
    if (input.isVisible !== undefined) updateData.is_visible = input.isVisible;
    if (input.weight !== undefined) updateData.weight = input.weight;
    if (input.dimensions !== undefined) updateData.dimensions = input.dimensions;
    if (input.tags !== undefined) updateData.tags = input.tags;

    const { data: product, error: productError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (productError) {
      throw new Error(`Failed to update product: ${productError.message}`);
    }

    // Fetch updated variants
    const { data: variants } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', id);

    return {
      success: true,
      product: {
        ...product,
        variants: variants || [],
      },
    };
  } catch (error) {
    console.error('Update product error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete a product and its variants
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete variants first (if foreign key constraints don't cascade)
    const { error: variantsError } = await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', id);

    if (variantsError) {
      throw new Error(`Failed to delete variants: ${variantsError.message}`);
    }

    // Delete the product
    const { error: productError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (productError) {
      throw new Error(`Failed to delete product: ${productError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Delete product error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
