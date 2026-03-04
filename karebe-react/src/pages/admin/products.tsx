import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Edit, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { ProductManager, Product, ProductCreateInput } from '@/features/admin/services/product-manager';
import { AuthGuard } from '@/features/auth/components/auth-guard';

const CATEGORIES = [
  { value: 'Beer', label: 'Beer' },
  { value: 'Wine', label: 'Wine' },
  { value: 'Spirit', label: 'Spirit' },
  { value: 'Cider', label: 'Cider' },
  { value: 'Ready to Drink', label: 'Ready to Drink' },
  { value: 'Non-Alcoholic', label: 'Non-Alcoholic' },
];

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
    brand: '',
    is_featured: false,
  });

  const productManager = new ProductManager();

  const loadProducts = async () => {
    setLoading(true);
    try {
      const filters = {
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
      };
      const data = await productManager.getProducts(filters);
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [searchQuery, categoryFilter]);

  const handleAddProduct = async () => {
    try {
      await productManager.createProduct(newProduct);
      setIsAddDialogOpen(false);
      setNewProduct({
        name: '',
        description: '',
        price: 0,
        category: 'Beer',
        stock_quantity: 0,
        image_url: '',
        unit_size: '',
        brand: '',
        is_featured: false,
      });
      loadProducts();
    } catch (error) {
      console.error('Failed to add product:', error);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    try {
      await productManager.updateProduct(editingProduct.id, {
        name: editingProduct.name,
        description: editingProduct.description || undefined,
        price: editingProduct.price,
        category: editingProduct.category,
        stock_quantity: editingProduct.stock_quantity,
        image_url: editingProduct.image_url || undefined,
        unit_size: editingProduct.unit_size || undefined,
        brand: editingProduct.brand || undefined,
        is_featured: editingProduct.is_featured,
      });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productManager.deleteProduct(id);
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditDialogOpen(true);
  };

  return (
    <AuthGuard requireAdmin>
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
              onValueChange={setCategoryFilter}
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
                  <div className="h-40 bg-gray-100 relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
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
                        <p className="text-sm text-gray-500">{product.brand || product.category}</p>
                      </div>
                      <span className="font-bold text-brand-600">KSh {product.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <Badge variant={product.stock_quantity > 0 ? 'default' : 'destructive'}>
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
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    placeholder="Brand name"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit_size">Unit Size</Label>
                <Input
                  id="unit_size"
                  value={newProduct.unit_size}
                  onChange={(e) => setNewProduct({ ...newProduct, unit_size: e.target.value })}
                  placeholder="e.g., 500ml, 1L"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={newProduct.image_url}
                  onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                  placeholder="https://..."
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
                    <Label htmlFor="edit-brand">Brand</Label>
                    <Input
                      id="edit-brand"
                      value={editingProduct.brand || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-unit_size">Unit Size</Label>
                  <Input
                    id="edit-unit_size"
                    value={editingProduct.unit_size || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit_size: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-image_url">Image URL</Label>
                  <Input
                    id="edit-image_url"
                    value={editingProduct.image_url || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
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
