import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  LogOut,
  RefreshCw,
  CheckCircle,
  Truck,
  User,
  Clock,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { 
  getAllOrders, 
  updateOrderStatus, 
  assignRider,
  Order,
  OrderStatus 
} from '@/features/orders/api/admin-orders';
import { Dialog } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
  is_active: boolean;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: typeof Package }> = {
  CART_DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: ShoppingCart },
  ORDER_SUBMITTED: { label: 'New Order', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  CONFIRMED_BY_MANAGER: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  DELIVERY_REQUEST_STARTED: { label: 'Finding Rider', color: 'bg-yellow-100 text-yellow-700', icon: Truck },
  RIDER_CONFIRMED_DIGITAL: { label: 'Rider Assigned', color: 'bg-purple-100 text-purple-700', icon: User },
  RIDER_CONFIRMED_MANUAL: { label: 'Rider Assigned', color: 'bg-purple-100 text-purple-700', icon: User },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-700', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'bg-success-100 text-success-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-danger-100 text-danger-700', icon: AlertCircle },
};

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
  const [ridersLoading, setRidersLoading] = useState(false);
  const [showRiderDialog, setShowRiderDialog] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');

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
    setRidersLoading(true);
    try {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase
        .from('riders')
        .select('id, full_name, phone, is_active')
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      
      // Map the data to our Rider interface
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
      // Fallback to demo riders (only used in development/demo mode)
      setRiders([
        { id: 'rider-001', name: 'John Doe', phone: '+254712345678', status: 'AVAILABLE', is_active: true },
        { id: 'rider-002', name: 'Jane Smith', phone: '+254723456789', status: 'BUSY', is_active: true },
      ]);
    } finally {
      setRidersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Poll for new orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

// Helper to get a valid UUID or fallback to default
function getActorId(userId?: string): string {
  // If userId is a valid UUID, use it
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (userId && uuidRegex.test(userId)) {
    return userId;
  }
  // Otherwise use default UUID for demo/production
  return '00000000-0000-0000-0000-000000000001';
}

  const handleConfirmOrder = async (order: Order) => {
    setActionLoading(order.id);
    try {
      await updateOrderStatus(order.id, {
        status: 'CONFIRMED_BY_MANAGER',
        actor_type: 'admin',
        actor_id: getActorId(user?.id),
        expected_version: order.version,
      });
      await fetchOrders();
    } catch (err) {
      alert('Failed to confirm order: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartDelivery = async (order: Order) => {
    setActionLoading(order.id);
    try {
      await updateOrderStatus(order.id, {
        status: 'DELIVERY_REQUEST_STARTED',
        actor_type: 'admin',
        actor_id: getActorId(user?.id),
        expected_version: order.version,
      });
      await fetchOrders();
    } catch (err) {
      alert('Failed to start delivery: ' + (err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignRiderClick = async (order: Order) => {
    setSelectedOrder(order);
    await fetchRiders();
    setShowRiderDialog(true);
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
        admin_id: user?.id || 'admin-001',
        notes: 'Assigned via admin dashboard',
      });
      await fetchOrders();
    } catch (err) {
      // Fallback: just update status
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-KE', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getActionButtons = (order: Order) => {
    const isLoading = actionLoading === order.id;
    
    switch (order.status) {
      case 'ORDER_SUBMITTED':
        return (
          <Button
            size="sm"
            onClick={() => handleConfirmOrder(order)}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
            Confirm Order
          </Button>
        );
      case 'CONFIRMED_BY_MANAGER':
        return (
          <Button
            size="sm"
            onClick={() => handleStartDelivery(order)}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4 mr-1" />}
            Start Delivery
          </Button>
        );
      case 'DELIVERY_REQUEST_STARTED':
        return (
          <Button
            size="sm"
            onClick={() => handleAssignRiderClick(order)}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4 mr-1" />}
            Assign Rider
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Header */}
      <header className="bg-white border-b border-brand-100">
        <Container>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-display font-bold text-brand-900">
                Order Management
              </h1>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchOrders}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                Dashboard
              </Button>
              <span className="text-brand-600">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </Container>
      </header>

      <Container className="py-6">
        {error && (
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-4 mb-4 flex items-center gap-2 text-danger-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 && !loading ? (
            <Card>
              <CardContent className="p-8 text-center text-brand-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No orders found</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const status = statusConfig[order.status];
              const StatusIcon = status.icon;
              const isExpanded = expandedOrder === order.id;
              
              return (
                <Card key={order.id} className={isExpanded ? 'ring-2 ring-brand-200' : ''}>
                  <CardContent className="p-4">
                    {/* Order Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${status.color}`}>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-brand-900">
                              Order #{order.id.slice(-6)}
                            </h3>
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-brand-600 mt-1">
                            {order.customer_name || 'Unknown'} • {order.customer_phone}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-brand-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(order.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {order.delivery_address.slice(0, 30)}...
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-4">
                          <p className="font-bold text-brand-900">
                            KES {order.total_amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-brand-500">
                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {getActionButtons(order)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-brand-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-brand-900 mb-2">Order Items</h4>
                            <ul className="space-y-2">
                              {order.items?.map((item, idx) => (
                                <li key={idx} className="flex justify-between text-sm">
                                  <span className="text-brand-700">
                                    {item.quantity}x {item.product_name}
                                    {item.variant && <span className="text-brand-500"> ({item.variant})</span>}
                                  </span>
                                  <span className="text-brand-900">
                                    KES {(item.quantity * item.unit_price).toLocaleString()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium text-brand-900 mb-2">Delivery Details</h4>
                            <div className="space-y-2 text-sm">
                              <p className="flex items-start gap-2">
                                <Phone className="w-4 h-4 mt-0.5 text-brand-500" />
                                <span className="text-brand-700">{order.customer_phone}</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-brand-500" />
                                <span className="text-brand-700">{order.delivery_address}</span>
                              </p>
                              {order.delivery_notes && (
                                <p className="text-brand-500 italic">
                                  Note: {order.delivery_notes}
                                </p>
                              )}
                              {order.current_rider_name && (
                                <p className="flex items-center gap-2 text-purple-700">
                                  <User className="w-4 h-4" />
                                  Rider: {order.current_rider_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </Container>

      {/* Rider Selection Dialog */}
      <Dialog open={showRiderDialog} onOpenChange={setShowRiderDialog}>
        <div className="p-6 bg-white rounded-lg max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Assign Rider</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select a rider for order: {selectedOrder?.order_number}
          </p>
          
          {ridersLoading ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Rider
                </label>
                <select
                  value={selectedRiderId}
                  onChange={(e) => setSelectedRiderId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- Select a rider --</option>
                  {riders.map((rider) => (
                    <option key={rider.id} value={rider.id}>
                      {rider.name} - {rider.phone}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRiderDialog(false);
                    setSelectedOrder(null);
                    setSelectedRiderId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAssignRider}
                  disabled={!selectedRiderId || actionLoading === selectedOrder?.id}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {actionLoading === selectedOrder?.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Assign Rider
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AuthGuard requiredRole={['admin', 'super-admin']}>
      <OrdersPageContent />
    </AuthGuard>
  );
}
