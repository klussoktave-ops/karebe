import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductManager, type ProductCreateInput } from '../product-manager';
import { supabase } from '@/lib/supabase';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.url/image.jpg' } })),
      })),
    },
  },
}));

describe('ProductManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should fetch all products without filters', async () => {
      const mockProducts = [
        { id: '1', name: 'Test Product', price: 100, category: 'Wine' },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const products = await ProductManager.getProducts();

      expect(mockFrom).toHaveBeenCalledWith('products');
      expect(products).toEqual(mockProducts);
    });

    it('should filter products by category', async () => {
      const mockProducts = [{ id: '1', name: 'Red Wine', category: 'Wine' }];

      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      (supabase.from as any) = mockFrom;

      await ProductManager.getProducts({ category: 'Wine' });

      expect(mockEq).toHaveBeenCalledWith('category', 'Wine');
    });

    it('should search products by name', async () => {
      const mockIlike = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: mockIlike,
        }),
      });

      (supabase.from as any) = mockFrom;

      await ProductManager.getProducts({ search: 'whiskey' });

      expect(mockIlike).toHaveBeenCalledWith('name', '%whiskey%');
    });

    it('should filter by price range', async () => {
      const mockGte = vi.fn().mockReturnValue({
        lte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: mockGte,
        }),
      });

      (supabase.from as any) = mockFrom;

      await ProductManager.getProducts({ minPrice: 1000, maxPrice: 5000 });

      expect(mockGte).toHaveBeenCalledWith('price', 1000);
    });

    it('should handle database errors', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      await expect(ProductManager.getProducts()).rejects.toThrow(
        'Failed to fetch products: Database connection failed'
      );
    });
  });

  describe('createProduct', () => {
    it('should create a new product successfully', async () => {
      const input: ProductCreateInput = {
        name: 'Premium Whiskey',
        description: 'Aged 12 years',
        price: 3500,
        category: 'Spirits',
        stock_quantity: 50,
        brand: 'Glenfiddich',
        alcohol_content: 40,
        unit_size: '750ml',
      };

      const mockProduct = {
        id: 'prod-123',
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProduct,
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      (supabase.from as any) = mockFrom;

      const result = await ProductManager.createProduct(input);

      expect(mockFrom).toHaveBeenCalledWith('products');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: input.name,
          price: input.price,
          category: input.category,
        })
      );
      expect(result).toEqual(mockProduct);
    });

    it('should throw error if product creation fails', async () => {
      const input: ProductCreateInput = {
        name: 'Test Product',
        price: 100,
        category: 'Test',
        stock_quantity: 10,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Unique constraint violated' },
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      (supabase.from as any) = mockFrom;

      await expect(ProductManager.createProduct(input)).rejects.toThrow(
        'Failed to create product: Unique constraint violated'
      );
    });

    it('should handle image upload', async () => {
      const file = new File(['test'], 'product.jpg', { type: 'image/jpeg' });

      const result = await ProductManager.uploadProductImage(file);

      expect(result).toContain('product_images');
      expect(result).toContain('.jpg');
    });
  });

  describe('updateProduct', () => {
    it('should update product stock quantity', async () => {
      const productId = 'prod-123';
      const newStock = 100;

      const mockProduct = {
        id: productId,
        stock_quantity: newStock,
        updated_at: new Date().toISOString(),
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProduct,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      (supabase.from as any) = mockFrom;

      const result = await ProductManager.updateStock(productId, newStock);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          stock_quantity: newStock,
        })
      );
      expect(result.stock_quantity).toBe(newStock);
    });

    it('should handle product deletion', async () => {
      const productId = 'prod-123';

      const mockEq = vi.fn().mockResolvedValue({ error: null });

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      });

      (supabase.from as any) = mockFrom;

      await ProductManager.deleteProduct(productId);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', productId);
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', async () => {
      const mockProducts = [
        { category: 'Wine' },
        { category: 'Spirits' },
        { category: 'Wine' },
        { category: 'Beer' },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const categories = await ProductManager.getCategories();

      expect(categories).toHaveLength(3);
      expect(categories).toContain('Wine');
      expect(categories).toContain('Spirits');
      expect(categories).toContain('Beer');
    });
  });
});