import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  LogOut,
  RefreshCw,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { 
  getAllOrders, 
  updateOrderStatus, 
  assignRider,
  Order,
  OrderItem,
  createAdminOrder,
  deleteOrder
} from '@/features/orders/api/admin-orders';
import { OrderCard, OrderCardAction } from '@/features/orders/components/order-card';
import { isPendingCall } from '@/features/orders/utils/order-display';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { getProducts } from '@/features/products/api/get-products';
import type { ProductDisplay } from '@/features/products/types';
import { orchestrationApiBase } from '@/lib/orchestration-api';

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
  is_active: boolean;
}

interface Branch {
  id: string;
  name: string;
  address?: string;
  is_main?: boolean;
  is_active?: boolean;
}

function OrdersPageContent() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [showRiderDialog, setShowRiderDialog] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');
  const [showCreateOrderDialog, setShowCreateOrderDialog] = useState(false);

  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    delivery_notes: '',
    branch_id: '',
  });
  const [draftItem, setDraftItem] = useState({
    productId: '',
    variantId: '',
    quantity: 1,
  });
  
  // Editing state for OrderCard
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    delivery_notes: ''
  });

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiders = async () => {
    try {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('riders')
        .select('id, full_name, phone, is_active')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      
      const mappedRiders: Rider[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.full_name,
        phone: r.phone || '',
        status: 'AVAILABLE',
        is_active: r.is_active
      }));
      setRiders(mappedRiders);
    } catch (err: any) {
      console.error('Failed to load riders:', err);
      setRiders([
        { id: '550e8400-e29b-41d4-a716-446655440000', name: 'John Rider', phone: '+254798765432', status: 'AVAILABLE', is_active: true },
      ]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchRiders();
    
    // Adaptive polling: faster for active orders, slower for completed
    const POLLING_INTERVAL = 15000; // 15 seconds - faster than before
    const interval = setInterval(fetchOrders, POLLING_INTERVAL);
    
    // Refresh on window focus for immediate updates
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchOrders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchProducts = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const result = await getProducts({ perPage: 200, inStock: true, sortBy: 'name_asc' });
      const list = result?.data || [];
      setProducts(list);
      if (list.length > 0) {
        const firstProduct = list[0];
        const firstVariant = firstProduct.variants?.[0];
        setDraftItem((prev) => ({
          productId: prev.productId || firstProduct.id,
          variantId: prev.variantId || (firstVariant ? firstVariant.id : ''),
          quantity: prev.quantity || 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      setProductsError('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchBranches = async () => {
    setBranchesLoading(true);
    setBranchesError(null);
    try {
      const response = await fetch(`${orchestrationApiBase}/admin/branches`);
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load branches');
      }
      const sorted = (result.data || []).sort((a: Branch, b: Branch) => {
        if (a.is_main && !b.is_main) return -1;
        if (!a.is_main && b.is_main) return 1;
        return a.name.localeCompare(b.name);
      });
      setBranches(sorted);
      if (!createForm.branch_id && sorted.length > 0) {
        const preferred = user?.branchId && isUuid(user.branchId) ? user.branchId : '';
        const preferredExists = preferred ? sorted.some((b) => b.id === preferred) : false;
        setCreateForm((prev) => ({ ...prev, branch_id: preferredExists ? preferred : sorted[0].id }));
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
      setBranchesError('Failed to load branches');
    } finally {
      setBranchesLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  function getActorId(userId?: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userId && uuidRegex.test(userId)) {
      return userId;
    }
    return '00000000-0000-0000-0000-000000000001';
  }

  const handleAction = async (action: OrderCardAction, order: Order) => {
    setActionLoading(order.id);
    try {
      switch (action) {
        case 'confirm':
          await updateOrderStatus(order.id, {
            status: 'CONFIRMED_BY_MANAGER',
            actor_type: 'admin',
            actor_id: getActorId(user?.id),
            expected_version: order.version,
          });
          break;
        case 'startDelivery':
          await updateOrderStatus(order.id, {
            status: 'DELIVERY_REQUEST_STARTED',
            actor_type: 'admin',
            actor_id: getActorId(user?.id),
            expected_version: order.version,
          });
          break;
        case 'sendOut':
          // Rider confirmed, now sending out for delivery
          await updateOrderStatus(order.id, {
            status: 'OUT_FOR_DELIVERY',
            actor_type: 'admin',
            actor_id: getActorId(user?.id),
            expected_version: order.version,
          });
          break;
        case 'confirmDelivery':
          await updateOrderStatus(order.id, {
            status: 'DELIVERED',
            actor_type: 'admin',
            actor_id: getActorId(user?.id),
            expected_version: order.version,
          });
          break;
        case 'cancel':
          await updateOrderStatus(order.id, {
            status: 'CANCELLED',
            actor_type: 'admin',
            actor_id: getActorId(user?.id),
            expected_version: order.version,
          });
          break;
        case 'delete':
          await deleteOrder(order.id, {
            actor_type: 'admin',
            actor_id: getActorId(user?.id),
            confirm: true,
          });
          break;
        case 'assignRider':
          setSelectedOrder(order);
          await fetchRiders();
          setShowRiderDialog(true);
          setActionLoading(null);
          return;
      }
      await fetchOrders();
    } catch (err) {
      alert(`Failed to ${action}: ` + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAssignRider = async () => {
    if (!selectedOrder || !selectedRiderId) {
      alert('Please select a rider');
      return;
    }
    
    setShowRiderDialog(false);
    setActionLoading(selectedOrder.id);
    
    try {
      await assignRider(selectedOrder.id, {
        rider_id: selectedRiderId,
        admin_id: getActorId(user?.id),
        notes: 'Assigned via admin dashboard',
      });
      await fetchOrders();
    } catch (err) {
      try {
        await updateOrderStatus(selectedOrder.id, {
          status: 'RIDER_CONFIRMED_DIGITAL',
          actor_type: 'admin',
          actor_id: getActorId(user?.id),
          expected_version: selectedOrder.version,
        });
        await fetchOrders();
      } catch (err2) {
        alert('Failed to assign rider: ' + (err2 as Error).message);
      }
    } finally {
      setActionLoading(null);
      setSelectedOrder(null);
      setSelectedRiderId('');
    }
  };

  const selectedProduct = products.find((p) => p.id === draftItem.productId);
  const selectedVariants = selectedProduct?.variants || [];
  const selectedVariant = selectedVariants.find((v) => v.id === draftItem.variantId) || selectedVariants[0];

  const handleAddItem = () => {
    setCreateError(null);
    setCreateSuccess(null);
    if (!selectedProduct) {
      setCreateError('Please select a product.');
      return;
    }
    if (!selectedVariant) {
      setCreateError('Please select a product variant.');
      return;
    }
    if (draftItem.quantity < 1) {
      setCreateError('Quantity must be at least 1.');
      return;
    }

    const newItem: OrderItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: draftItem.quantity,
      unit_price: selectedVariant.price,
      variant: selectedVariant.volume,
    };

    setOrderItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const orderTotal = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleCreateOrder = async () => {
    setCreateError(null);
    setCreateSuccess(null);
    if (orderItems.length === 0) {
      setCreateError('Add at least one item.');
      return;
    }

    setCreateLoading(true);
    try {
      await createAdminOrder({
        customer_phone: createForm.customer_phone.trim() || null,
        customer_name: createForm.customer_name.trim() || null,
        delivery_address: createForm.delivery_address.trim() || null,
        delivery_notes: createForm.delivery_notes.trim() || null,
        branch_id: createForm.branch_id || null,
        items: orderItems,
        total: orderTotal,
        trigger_source: 'call_button',
      });
      setCreateSuccess('Order created successfully.');
      setOrderItems([]);
      setCreateForm({ customer_name: '', customer_phone: '', delivery_address: '', delivery_notes: '', branch_id: createForm.branch_id });
      await fetchOrders();
      // Close the dialog after successful creation
      setShowCreateOrderDialog(false);
    } catch (err) {
      setCreateError((err as Error).message || 'Failed to create order.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit handlers for OrderCard
  const handleStartEdit = (order: Order) => {
    setEditingOrderId(order.id);
    setEditForm({
      customer_name: order.customer_name || '',
      customer_phone: isPendingCall(order.customer_phone) ? '' : (order.customer_phone || ''),
      delivery_address: isPendingCall(order.delivery_address) ? '' : (order.delivery_address || ''),
      delivery_notes: order.delivery_notes || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setEditForm({ customer_name: '', customer_phone: '', delivery_address: '', delivery_notes: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingOrderId) return;
    
    const order = orders.find(o => o.id === editingOrderId);
    if (!order) return;

    const ORCHESTRATION_API_URL = orchestrationApiBase;

    try {
      const normalizedOriginal = {
        customer_name: order.customer_name || '',
        customer_phone: isPendingCall(order.customer_phone) ? '' : (order.customer_phone || ''),
        delivery_address: isPendingCall(order.delivery_address) ? '' : (order.delivery_address || ''),
        delivery_notes: order.delivery_notes || '',
      };
      const normalizedEdits = {
        customer_name: editForm.customer_name.trim(),
        customer_phone: editForm.customer_phone?.trim() || '',
        delivery_address: editForm.delivery_address.trim(),
        delivery_notes: editForm.delivery_notes.trim(),
      };

      const hasChanges = Object.keys(normalizedEdits).some((key) => {
        const field = key as keyof typeof normalizedEdits;
        return normalizedEdits[field] !== normalizedOriginal[field];
      });

      if (hasChanges) {
        const payload: Record<string, unknown> = {
          actor_type: 'admin',
          actor_id: getActorId(user?.id),
        };

        if (normalizedEdits.customer_name) {
          payload.customer_name = normalizedEdits.customer_name;
        }
        if (normalizedEdits.customer_phone !== '') {
          payload.customer_phone = normalizedEdits.customer_phone;
        } else if (normalizedOriginal.customer_phone !== '') {
          payload.customer_phone = '';
        }
        if (normalizedEdits.delivery_address) {
          payload.delivery_address = normalizedEdits.delivery_address;
        }
        if (normalizedEdits.delivery_notes !== '' || normalizedOriginal.delivery_notes !== '') {
          payload.delivery_notes = normalizedEdits.delivery_notes;
        }

        const response = await fetch(`${ORCHESTRATION_API_URL}/orders/${editingOrderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          // Refresh orders to show updated data
          await fetchOrders();
        } else {
          console.error('Failed to save order:', await response.text());
        }
      }
      
      setEditingOrderId(null);
      setEditForm({ customer_name: '', customer_phone: '', delivery_address: '', delivery_notes: '' });
    } catch (error) {
      console.error('Failed to save order details:', error);
      setEditingOrderId(null);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Header */}
      <header className="bg-white border-b border-brand-100 sticky top-0 z-10">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between h-auto sm:h-16 py-3 sm:py-0 gap-2 sm:gap-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <h1 className="text-lg sm:text-xl font-display font-bold text-brand-900">
                  Order Management
                </h1>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchOrders}
                  disabled={loading}
                  className="hidden sm:flex"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchOrders}
                disabled={loading}
                className="sm:hidden p-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
              <Button 
                size="sm" 
                onClick={() => setShowCreateOrderDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Create Order</span>
                <span className="sm:hidden">+ New</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="whitespace-nowrap text-sm">
                Dashboard
              </Button>
              <span className="text-sm text-brand-600 hidden sm:inline">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout} className="whitespace-nowrap">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </Container>
      </header>

      <Container className="py-4 sm:py-6 px-2 sm:px-4">
        {error && (
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 sm:p-4 mb-4 flex items-center gap-2 text-danger-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-3 sm:space-y-4">
          {orders.length === 0 && !loading ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center text-brand-500">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                <p>No orders found</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                riders={riders}
                isExpanded={expandedOrder === order.id}
                onToggleExpand={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                isEditing={editingOrderId === order.id}
                editForm={editForm}
                onStartEdit={() => handleStartEdit(order)}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
                onFormChange={handleFormChange}
                actionLoading={actionLoading === order.id}
                onAction={(action) => handleAction(action, order)}
              />
            ))
          )}
        </div>
      </Container>

      {/* Create Order Dialog */}
      <Dialog open={showCreateOrderDialog} onOpenChange={setShowCreateOrderDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <h2 className="text-xl font-semibold">Create New Order</h2>
            <p className="text-sm text-brand-600">Take phone or walk-in orders and add items manually.</p>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {productsError && (
              <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 text-danger-700 text-sm">
                {productsError}
              </div>
            )}

            {branchesError && (
              <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 text-danger-700 text-sm">
                {branchesError}
              </div>
            )}

            {createError && (
              <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 text-danger-700 text-sm">
                {createError}
              </div>
            )}

            {createSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                {createSuccess}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-brand-800">Branch</label>
                <select
                  value={createForm.branch_id}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, branch_id: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  disabled={branchesLoading || branches.length === 0}
                >
                  {branches.length === 0 ? (
                    <option value="">No branches available</option>
                  ) : (
                    branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-800">Customer Name</label>
                <input
                  value={createForm.customer_name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, customer_name: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-800">Customer Phone</label>
                <input
                  value={createForm.customer_phone}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, customer_phone: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  placeholder="+254..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-brand-800">Delivery Address</label>
                <input
                  value={createForm.delivery_address}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, delivery_address: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  placeholder="Address"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-brand-800">Delivery Notes</label>
                <input
                  value={createForm.delivery_notes}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, delivery_notes: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-brand-800">Product</label>
                <select
                  value={draftItem.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    const product = products.find((p) => p.id === productId);
                    const variant = product?.variants?.[0];
                    setDraftItem((prev) => ({
                      ...prev,
                      productId,
                      variantId: variant ? variant.id : '',
                    }));
                  }}
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  disabled={productsLoading || products.length === 0}
                >
                  {products.length === 0 ? (
                    <option value="">No products available</option>
                  ) : (
                    products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-800">Variant</label>
                <select
                  value={draftItem.variantId}
                  onChange={(e) => setDraftItem((prev) => ({ ...prev, variantId: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  disabled={productsLoading || selectedVariants.length === 0}
                >
                  {selectedVariants.length === 0 ? (
                    <option value="">No variants</option>
                  ) : (
                    selectedVariants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.volume} - KES {variant.price.toLocaleString()}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-brand-800">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={draftItem.quantity}
                  onChange={(e) => setDraftItem((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button onClick={handleAddItem} disabled={productsLoading || products.length === 0}>
                Add Item
              </Button>
              <div className="text-sm text-brand-700 font-medium">
                Total: KES {orderTotal.toLocaleString()}
              </div>
            </div>

            <div className="border border-brand-100 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
                <div className="col-span-5">Item</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-3 text-right">Unit</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {orderItems.length === 0 ? (
                <div className="px-3 py-4 text-sm text-brand-500">No items added yet.</div>
              ) : (
                orderItems.map((item, index) => (
                  <div key={`${item.product_id}-${index}`} className="grid grid-cols-12 items-center px-3 py-2 border-t text-sm">
                    <div className="col-span-5">
                      {item.product_name} {item.variant ? `(${item.variant})` : ''}
                    </div>
                    <div className="col-span-2 text-right">{item.quantity}</div>
                    <div className="col-span-3 text-right">KES {item.unit_price.toLocaleString()}</div>
                    <div className="col-span-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateOrderDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrder} disabled={createLoading || orderItems.length === 0}>
                {createLoading ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rider Selection Dialog */}
      <Dialog open={showRiderDialog} onOpenChange={setShowRiderDialog}>
        <DialogContent>
          <DialogHeader>
            <h3 className="text-lg font-semibold">Assign Rider</h3>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-4">
            Select a rider for order: #{selectedOrder?.id?.slice(-6)}
          </p>
          <select
            value={selectedRiderId}
            onChange={(e) => setSelectedRiderId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-base sm:text-sm"
          >
            <option value="">Select a rider...</option>
            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.name} - {rider.phone}
              </option>
            ))}
          </select>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowRiderDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAssignRider} 
              disabled={!selectedRiderId}
              className="flex-1"
            >
              Assign Rider
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <AuthGuard>
      <OrdersPageContent />
    </AuthGuard>
  );
}
