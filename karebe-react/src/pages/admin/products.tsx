import { useState, useEffect, useRef } from 'react';
import { Package, Plus, Trash2, Edit, Search, AlertCircle, Upload, Camera, Link as LinkIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { ImageGallery } from '@/components/ui/image-gallery';
import { ProductManager, Product, ProductCreateInput } from '@/features/admin/services/product-manager';
import { AuthGuard } from '@/features/auth/components/auth-guard';

// Expanded categories for wines & spirits
const CATEGORIES = [
  { value: 'Wine', label: 'Wine' },
  { value: 'Whisky', label: 'Whisky' },
  { value: 'Vodka', label: 'Vodka' },
  { value: 'Gin', label: 'Gin' },
  { value: 'Rum', label: 'Rum' },
  { value: 'Brandy', label: 'Brandy' },
  { value: 'Tequila', label: 'Tequila' },
  { value: 'Beer', label: 'Beer' },
  { value: 'Cider', label: 'Cider' },
  { value: 'Champagne', label: 'Champagne' },
  { value: 'Ready to Drink', label: 'Ready to Drink' },
  { value: 'Non-Alcoholic', label: 'Non-Alcoholic' },
  { value: 'Soft Drink', label: 'Soft Drink' },
];

// Size options based on category
const SIZE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  Wine: [
    { value: '375ml', label: '375ml' },
    { value: '750ml', label: '750ml' },
    { value: '1.5L', label: '1.5L' },
  ],
  Champagne: [
    { value: '375ml', label: '375ml' },
    { value: '750ml', label: '750ml' },
    { value: '1.5L', label: '1.5L' },
  ],
  Beer: [
    { value: '330ml', label: '330ml' },
    { value: '500ml', label: '500ml' },
  ],
  Cider: [
    { value: '330ml', label: '330ml' },
    { value: '500ml', label: '500ml' },
  ],
  'Ready to Drink': [
    { value: '250ml', label: '250ml' },
    { value: '330ml', label: '330ml' },
    { value: '350ml', label: '350ml' },
  ],
  Spirit: [
    { value: '350ml', label: '350ml' },
    { value: '700ml', label: '700ml' },
    { value: '750ml', label: '750ml' },
    { value: '1L', label: '1L' },
  ],
  Whisky: [
    { value: '350ml', label: '350ml' },
    { value: '700ml', label: '700ml' },
    { value: '750ml', label: '750ml' },
    { value: '1L', label: '1L' },
  ],
  Vodka: [
    { value: '350ml', label: '350ml' },
    { value: '700ml', label: '700ml' },
    { value: '750ml', label: '750ml' },
    { value: '1L', label: '1L' },
  ],
  Gin: [
    { value: '350ml', label: '350ml' },
    { value: '700ml', label: '700ml' },
    { value: '750ml', label: '750ml' },
    { value: '1L', label: '1L' },
  ],
  Rum: [
    { value: '350ml', label: '350ml' },
    { value: '700ml', label: '700ml' },
    { value: '750ml', label: '750ml' },
    { value: '1L', label: '1L' },
  ],
  Brandy: [
    { value: '350ml', label: '350ml' },
    { value: '700ml', label: '700ml' },
    { value: '750ml', label: '750ml' },
    { value: '1L', label: '1L' },
  ],
  Tequila: [
    { value: '350ml', label: '350ml' },
    { value: '700ml', label: '700ml' },
    { value: '750ml', label: '750ml' },
    { value: '1L', label: '1L' },
  ],
  'Non-Alcoholic': [
    { value: '250ml', label: '250ml' },
    { value: '330ml', label: '330ml' },
    { value: '500ml', label: '500ml' },
    { value: '1L', label: '1L' },
  ],
  'Soft Drink': [
    { value: '250ml', label: '250ml' },
    { value: '330ml', label: '330ml' },
    { value: '500ml', label: '500ml' },
    { value: '1L', label: '1L' },
    { value: '1.75L', label: '1.75L' },
  ],
};

// Get sizes for a category
const getSizesForCategory = (category: string): { value: string; label: string }[] => {
  // Check exact match first
  if (SIZE_OPTIONS[category]) {
    return SIZE_OPTIONS[category];
  }
  // For spirits category
  if (category === 'Spirit') {
    return SIZE_OPTIONS['Spirit'];
  }
  // Default to common sizes
  return [
    { value: '250ml', label: '250ml' },
    { value: '330ml', label: '330ml' },
    { value: '500ml', label: '500ml' },
    { value: '700ml', label: '700ml' },
    { value: '750ml', label: '750ml' },
    { value: '1L', label: '1L' },
  ];
};

// Handle image file selection with progress simulation
const handleImageFile = (
  file: File, 
  setProduct: React.Dispatch<React.SetStateAction<ProductCreateInput>>, 
  setPreview: React.Dispatch<React.SetStateAction<string>>,
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>
) => {
  if (file && file.type.startsWith('image/')) {
    // Simulate upload progress
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress((prev: number) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    const reader = new FileReader();
    reader.onloadend = () => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        setPreview(reader.result as string);
        setProduct((prev) => ({ ...prev, image_url: reader.result as string }));
        setUploadProgress(0);
      }, 300);
    };
    reader.readAsDataURL(file);
  }
};

// Handle URL input for image
const handleImageUrl = (
  url: string,
  setProduct: React.Dispatch<React.SetStateAction<ProductCreateInput>>,
  setPreview: React.Dispatch<React.SetStateAction<string>>,
  setUrlError: React.Dispatch<React.SetStateAction<string>>
) => {
  setUrlError('');
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    setUrlError('Please enter a valid URL starting with http:// or https://');
    return;
  }
  setPreview(url);
  setProduct((prev) => ({ ...prev, image_url: url }));
};

// Image Upload Component
function ImageUploadSection({
  imageMode,
  setImageMode,
  imagePreview,
  setImagePreview,
  setNewProduct,
  uploadProgress,
  setUploadProgress,
  urlError,
  setUrlError,
  fileInputRef,
}: {
  imageMode: 'url' | 'upload' | 'camera';
  setImageMode: (mode: 'url' | 'upload' | 'camera') => void;
  imagePreview: string;
  setImagePreview: (url: string) => void;
  setNewProduct: React.Dispatch<React.SetStateAction<ProductCreateInput>>;
  uploadProgress: number;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  urlError: string;
  setUrlError: (error: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const [urlInput, setUrlInput] = useState('');

  return (
    <div className="grid gap-3">
      <Label>Product Image</Label>
      
      {/* Mode Tabs */}
      <div className="flex rounded-lg border bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => setImageMode('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            imageMode === 'upload' 
              ? 'bg-white shadow-sm text-brand-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
        <button
          type="button"
          onClick={() => setImageMode('url')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            imageMode === 'url' 
              ? 'bg-white shadow-sm text-brand-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          URL
        </button>
        <button
          type="button"
          onClick={() => setImageMode('camera')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            imageMode === 'camera' 
              ? 'bg-white shadow-sm text-brand-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Camera className="h-4 w-4" />
          Camera
        </button>
      </div>

      {/* Upload Mode */}
      {imageMode === 'upload' && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-brand-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImageFile(file, setNewProduct, setImagePreview, setUploadProgress);
              }
            }}
          />
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => {
                  setImagePreview('');
                  setNewProduct((prev) => ({ ...prev, image_url: '' }));
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 text-gray-500 hover:text-brand-600"
            >
              <Upload className="h-8 w-8" />
              <span className="text-sm">Click to upload image</span>
              <span className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</span>
            </button>
          )}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-500 transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
            </div>
          )}
        </div>
      )}

      {/* URL Mode */}
      {imageMode === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleImageUrl(urlInput, setNewProduct, setImagePreview, setUrlError);
                }
              }}
              className="flex-1"
            />
            <Button 
              type="button" 
              variant="outline"
              onClick={() => handleImageUrl(urlInput, setNewProduct, setImagePreview, setUrlError)}
            >
              Add
            </Button>
          </div>
          {urlError && <p className="text-xs text-red-500">{urlError}</p>}
          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border" />
              <button
                type="button"
                onClick={() => {
                  setImagePreview('');
                  setUrlInput('');
                  setNewProduct((prev) => ({ ...prev, image_url: '' }));
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Camera Mode */}
      {imageMode === 'camera' && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            id="camera-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImageFile(file, setNewProduct, setImagePreview, setUploadProgress);
              }
            }}
          />
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => {
                  setImagePreview('');
                  setNewProduct((prev) => ({ ...prev, image_url: '' }));
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label htmlFor="camera-input" className="flex flex-col items-center gap-2 text-gray-500 hover:text-brand-600 cursor-pointer">
              <Camera className="h-8 w-8" />
              <span className="text-sm">Take photo with camera</span>
              <span className="text-xs text-gray-400">Tap to open camera</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [newProduct, setNewProduct] = useState<ProductCreateInput>({
    name: '',
    description: '',
    price: 0,
    category: 'Beer',
    stock_quantity: 0,
    image_url: '',
    unit_size: '',
    is_featured: false,
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageMode, setImageMode] = useState<'url' | 'upload' | 'camera'>('url');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlError, setUrlError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);


  const loadProducts = async () => {
    setLoading(true);
    try {
      console.log('[Admin Products] Loading products...', { searchQuery, categoryFilter });
      const filters = {
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
      };
      console.log('[Admin Products] Fetch with filters:', filters);
      const data = await ProductManager.getProducts(filters);
      console.log('[Admin Products] Products loaded:', { count: data.length });
      
      // Debug: Log image URLs for each product
      data.forEach((product, index) => {
        console.log(`[Admin Products] Product ${index + 1}/${data.length}:`, {
          id: product.id,
          name: product.name,
          imageUrl: product.image_url,
          hasImage: !!product.image_url,
        });
      });
      
      setProducts(data);
    } catch (error) {
      console.error('[Admin Products] Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [searchQuery, categoryFilter]);

  const handleAddProduct = async () => {
    try {
      console.log('[Admin Products] Adding product:', newProduct);
      await ProductManager.createProduct(newProduct);
      console.log('[Admin Products] Product added successfully');
      setIsAddDialogOpen(false);
      setNewProduct({
        name: '',
        description: '',
        price: 0,
        category: 'Beer',
        stock_quantity: 0,
        image_url: '',
        unit_size: '',
        is_featured: false,
      });
      loadProducts();
    } catch (error) {
      console.error('[Admin Products] Failed to add product:', error);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    try {
      console.log('[Admin Products] Updating product:', {
        id: editingProduct.id,
        name: editingProduct.name,
        imageUrl: editingProduct.image_url,
      });
      
      // Use ProductManager to update the product
      await ProductManager.updateProduct(editingProduct.id, {
        name: editingProduct.name,
        description: editingProduct.description || undefined,
        price: editingProduct.price,
        category: (editingProduct as any).category_name || editingProduct.category || 'Spirits',
        image_url: editingProduct.image_url || editingProduct.image || undefined,
        stock_quantity: editingProduct.stock_quantity,
        unit_size: editingProduct.unit_size || undefined,
        is_featured: editingProduct.is_featured || false,
      });
      
      console.log('[Admin Products] Product updated successfully');
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('[Admin Products] Failed to update product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      console.log('[Admin Products] Deleting product:', id);
      await ProductManager.deleteProduct(id);
      console.log('[Admin Products] Product deleted successfully');
      loadProducts();
    } catch (error) {
      console.error('[Admin Products] Failed to delete product:', error);
    }
  };

  const openEditDialog = (product: Product) => {
    console.log('[Admin Products] Opening edit dialog for:', {
      id: product.id,
      name: product.name,
      imageUrl: product.image_url,
    });
    setEditingProduct({ ...product });
    setIsEditDialogOpen(true);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 rounded-lg">
                  <Package className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Manage Products</h1>
                  <p className="text-sm text-gray-500">Add, edit, and manage your product inventory</p>
                </div>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[{ value: 'all', label: 'All Categories' }, ...CATEGORIES]}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-48"
            />
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-40 bg-gray-200 rounded-lg mb-4" />
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No products found</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  Add your first product
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.error('[Admin Products] Image load error:', {
                            productId: product.id,
                            productName: product.name,
                            imageUrl: product.image_url,
                            error: 'Image failed to load',
                          });
                          // Show placeholder on error
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('[Admin Products] Image loaded:', {
                            productId: product.id,
                            imageUrl: product.image_url,
                          });
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    {product.is_featured && (
                      <Badge className="absolute top-2 right-2 bg-gold-500">Featured</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.category}</p>
                      </div>
                      <span className="font-bold text-brand-600">KSh {product.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <Badge variant={product.stock_quantity > 0 ? 'default' : 'danger'}>
                        {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                      </Badge>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* Add Product Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>Enter the product details below</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Enter product description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Price (KSh)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    options={CATEGORIES}
                    value={newProduct.category}
                    onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit_size">Size</Label>
                  <Select
                    options={getSizesForCategory(newProduct.category)}
                    value={newProduct.unit_size || ''}
                    onValueChange={(value) => setNewProduct({ ...newProduct, unit_size: value })}
                    placeholder="Select size"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <ImageGallery
                  images={newProduct.image_url ? [newProduct.image_url] : []}
                  onImagesChange={(images) => setNewProduct({ ...newProduct, image_url: images[0] || '' })}
                  maxImages={1}
                  label="Product Image"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddProduct} disabled={!newProduct.name || newProduct.price <= 0}>
                Add Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update the product details below</DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Product Name</Label>
                  <Input
                    id="edit-name"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-price">Price (KSh)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-stock">Stock Quantity</Label>
                    <Input
                      id="edit-stock"
                      type="number"
                      value={editingProduct.stock_quantity}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      options={CATEGORIES}
                      value={editingProduct.category}
                      onValueChange={(value) => setEditingProduct({ ...editingProduct, category: value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-unit_size">Size</Label>
                    <Select
                      options={getSizesForCategory(editingProduct.category)}
                      value={editingProduct.unit_size || ''}
                      onValueChange={(value) => setEditingProduct({ ...editingProduct, unit_size: value })}
                      placeholder="Select size"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Product Images</Label>
                  <ImageGallery
                    images={editingProduct?.image_url ? [editingProduct.image_url] : []}
                    onImagesChange={(images) => {
                      if (editingProduct) {
                        setEditingProduct({ ...editingProduct, image_url: images[0] || '' });
                      }
                    }}
                    maxImages={1}
                    label=""
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateProduct} disabled={!editingProduct?.name || editingProduct?.price <= 0}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
