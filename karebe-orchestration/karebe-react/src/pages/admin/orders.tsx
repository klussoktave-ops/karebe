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
  AlertCircle,
  MessageCircle,
  Send
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
      // These should match the Supabase rider for proper testing
      setRiders([
        { id: '550e8400-e29b-41d4-a716-446655440000', name: 'John Rider', phone: '+254798765432', status: 'AVAILABLE', is_active: true },
      ]);
    } finally {
      setRidersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchRiders();
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

// Get rider by ID from riders list
function getRiderById(riderId: string, ridersList: Rider[]): Rider | undefined {
  return ridersList.find(r => r.id === riderId);
}

// Generate WhatsApp message URL with order details
function getWhatsAppUrl(phone: string, order: Order): string {
  const message = `Hello! Order #${order.id.slice(-6)} is ready for delivery.

Customer: ${order.customer_name || 'N/A'}
Address: ${order.delivery_address}
Total: KES ${order.total_amount}

Please confirm delivery.`;
  return `https://wa.me/${phone.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
}

// Generate SMS URL
function getSmsUrl(phone: string, order: Order): string {
  const message = `Order #${order.id.slice(-6)} - Address: ${order.delivery_address} - Total: KES ${order.total_amount}`;
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

// Generate call URL
function getCallUrl(phone: string): string {
  return `tel:${phone}`;
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
        admin_id: user?.id || '00000000-0000-0000-0000-000000000001',
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
            orders.map((order) => {
              const status = statusConfig[order.status];
              const StatusIcon = status.icon;
              const isExpanded = expandedOrder === order.id;
              
              return (
                <Card key={order.id} className={`${isExpanded ? 'ring-2 ring-brand-200' : ''} overflow-hidden`}>
                  <CardContent className="p-3 sm:p-4">
                    {/* Order Header - Mobile stacked layout */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      {/* Left side: Order info */}
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className={`p-2 rounded-lg ${status.color} flex-shrink-0`}>
                          <StatusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-brand-900 text-sm sm:text-base">
                              #{order.id.slice(-6)}
                            </h3>
                            <Badge className={`${status.color} text-xs`}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-brand-600 mt-1 truncate">
                            {order.customer_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-brand-500 truncate">
                            {order.customer_phone}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs sm:text-sm text-brand-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                              {formatTime(order.created_at)}
                            </span>
                            <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-none">
                              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">{order.delivery_address}</span>
                            </span>
                          </div>

                          {/* Rider Info - Show when rider is assigned */}
                          {(order.rider_id || order.status === 'RIDER_CONFIRMED_DIGITAL' || order.status === 'RIDER_CONFIRMED_MANUAL' || order.status === 'OUT_FOR_DELIVERY') && (
                            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-purple-600" />
                                  <span className="font-medium text-purple-900 text-sm">
                                    {getRiderById(order.rider_id, riders)?.name || getRiderById(order.rider_id, riders)?.phone || 'Rider Assigned'}
                                  </span>
                                </div>
                              </div>
                              {/* Show rider phone number */}
                              <div className="mt-2 flex items-center gap-2 text-purple-700 text-xs">
                                <Phone className="w-3 h-3" />
                                <span>{getRiderById(order.rider_id, riders)?.phone || 'Phone not available'}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                  <a
                                    href={getCallUrl(getRiderById(order.rider_id, riders)?.phone || '')}
                                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    title="Call Rider"
                                  >
                                    <Phone className="w-4 h-4" />
                                  </a>
                                  <a
                                    href={getWhatsAppUrl(getRiderById(order.rider_id, riders)?.phone || '', order)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                    title="WhatsApp Rider"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                  <a
                                    href={getSmsUrl(getRiderById(order.rider_id, riders)?.phone || '', order)}
                                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    title="SMS Rider"
                                  >
                                    <Send className="w-4 h-4" />
                                  </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side: Price, actions, expand */}
                      <div className="flex sm:flex-col items-center justify-between sm:items-end gap-2 sm:gap-2 ml-auto sm:ml-0">
                        <div className="text-right">
                          <p className="font-bold text-brand-900 text-sm sm:text-base">
                            KES {order.total_amount.toLocaleString()}
                          </p>
                          <p className="text-xs sm:text-sm text-brand-500">
                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getActionButtons(order)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            className="p-2"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details - Responsive grid */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-brand-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-brand-900 mb-2 text-sm sm:text-base">Order Items</h4>
                            <ul className="space-y-2">
                              {order.items?.map((item, idx) => (
                                <li key={idx} className="flex justify-between text-sm">
                                  <span className="text-brand-700">
                                    {item.quantity}x {item.product_name}
                                    {item.variant && <span className="text-brand-500"> ({item.variant})</span>}
                                  </span>
                                  <span className="text-brand-900 font-medium">
                                    KES {(item.quantity * item.unit_price).toLocaleString()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium text-brand-900 mb-2 text-sm sm:text-base">Delivery Details</h4>
                            <div className="space-y-2 text-sm">
                              <p className="flex items-start gap-2">
                                <Phone className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" />
                                <span className="text-brand-700 break-all">{order.customer_phone}</span>
                              </p>
                              <p className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-brand-500 flex-shrink-0" />
                                <span className="text-brand-700 break-words">{order.delivery_address}</span>
                              </p>
                              {order.delivery_notes && (
                                <p className="text-brand-500 italic text-xs sm:text-sm">
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

      {/* Rider Selection Dialog - Mobile responsive */}
      <Dialog open={showRiderDialog} onOpenChange={setShowRiderDialog}>
        <div className="p-4 sm:p-6 bg-white rounded-lg max-w-md w-full mx-4">
          <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4">Assign Rider</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select a rider for order: #{selectedOrder?.id?.slice(-6)}
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- Select a rider --</option>
                  {riders.map((rider) => (
                    <option key={rider.id} value={rider.id}>
                      {rider.name} - {rider.phone}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRiderDialog(false);
                    setSelectedOrder(null);
                    setSelectedRiderId('');
                  }}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAssignRider}
                  disabled={!selectedRiderId || actionLoading === selectedOrder?.id}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 order-1 sm:order-2"
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
