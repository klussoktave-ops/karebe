import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  LogOut,
  RefreshCw,
  AlertCircle
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
  Order
} from '@/features/orders/api/admin-orders';
import { OrderCard } from '@/features/orders/components/order-card';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
  is_active: boolean;
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
  
  // Editing state for OrderCard
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
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
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  function getActorId(userId?: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userId && uuidRegex.test(userId)) {
      return userId;
    }
    return '00000000-0000-0000-0000-000000000001';
  }

  const handleAction = async (action: 'confirm' | 'startDelivery' | 'assignRider', order: Order) => {
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
        admin_id: user?.id || '00000000-0000-0000-0000-000000000001',
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

  // Edit handlers for OrderCard
  const handleStartEdit = (order: Order) => {
    setEditingOrderId(order.id);
    setEditForm({
      customer_name: order.customer_name || '',
      delivery_address: order.delivery_address || '',
      delivery_notes: order.delivery_notes || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setEditForm({ customer_name: '', delivery_address: '', delivery_notes: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingOrderId) return;
    
    const order = orders.find(o => o.id === editingOrderId);
    if (!order) return;

    try {
      console.log('Saving order details:', editForm);
      setEditingOrderId(null);
      setEditForm({ customer_name: '', delivery_address: '', delivery_notes: '' });
    } catch (error) {
      console.error('Failed to save order details:', error);
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

        {/* Orders List - Using modern OrderCard component */}
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
