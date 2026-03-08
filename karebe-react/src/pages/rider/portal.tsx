import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  MapPin, 
  CheckCircle, 
  LogOut, 
  Phone,
  Navigation,
  Clock,
  RefreshCw,
  ArrowLeftRight,
  Shield,
  LayoutDashboard
} from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useRiderOrders } from '@/features/rider/hooks/use-rider-orders';
import { getAvailableRoleSwitches } from '@/features/auth/utils/role-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserRole } from '@/features/auth/stores/auth-store';

// Helper to format status
const formatStatus = (status: string) => {
  return status?.replace(/_/g, ' ') || 'Unknown';
};

// Get badge variant based on status
const getStatusVariant = (status: string): 'default' | 'warning' | 'success' | 'info' | 'secondary' | 'danger' | 'gold' => {
  switch (status) {
    case 'DELIVERY_REQUEST_STARTED':
    case 'RIDER_CONFIRMED_DIGITAL':
    case 'RIDER_CONFIRMED_MANUAL':
      return 'warning';
    case 'OUT_FOR_DELIVERY':
      return 'info';
    case 'DELIVERED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
};

function RiderPortalContent() {
  const navigate = useNavigate();
  const { logout, user, switchRole } = useAuth();
  const {
    orders,
    pendingOrders,
    activeOrders,
    completedOrders,
    isLoading,
    error,
    refetch,
    confirmOrder,
    startDeliveryOrder,
    completeOrder
  } = useRiderOrders();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleConfirm = async (orderId: string) => {
    setActionLoading(orderId);
    await confirmOrder(orderId);
    setActionLoading(null);
  };

  const handleStartDelivery = async (orderId: string) => {
    setActionLoading(orderId);
    await startDeliveryOrder(orderId);
    setActionLoading(null);
  };

  const handleComplete = async (orderId: string) => {
    setActionLoading(orderId);
    await completeOrder(orderId);
    setActionLoading(null);
  };

  // Show all orders grouped by status
  const allDeliveries = [...pendingOrders, ...activeOrders];

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Header */}
      <header className="bg-white border-b border-brand-100">
        <Container>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-100 rounded-lg">
                <Navigation className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h1 className="font-display font-bold text-brand-900">Rider Portal</h1>
                <p className="text-xs text-brand-500">Welcome, {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Role Switcher - only show if user has multiple role options */}
              {user && (() => {
                const roleSwitches = getAvailableRoleSwitches(user.role);
                if (roleSwitches.length > 1) {
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ArrowLeftRight className="w-4 h-4 mr-1" />
                          Switch
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Switch to Role</DropdownMenuLabel>
                        {roleSwitches.map((switchOption) => (
                          <DropdownMenuItem
                            key={switchOption.role}
                            onClick={() => {
                              switchRole(switchOption.role);
                              navigate(switchOption.route);
                            }}
                            className={user.role === switchOption.role ? 'bg-brand-50 font-medium' : ''}
                          >
                            {switchOption.role === 'admin' && <Shield className="h-4 w-4 mr-2" />}
                            {switchOption.role === 'rider' && <Navigation className="h-4 w-4 mr-2" />}
                            {switchOption.role === 'customer' && <LayoutDashboard className="h-4 w-4 mr-2" />}
                            {switchOption.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }
                return null;
              })()}

              <Button variant="ghost" size="sm" onClick={refetch} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </Container>
      </header>

      <Container className="py-6">
        {/* Debug info */}
        {user && (
          <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg mb-4 text-xs">
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Orders:</strong> {orders.length} total, {pendingOrders.length} pending, {activeOrders.length} active, {completedOrders.length} completed</p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4 text-red-700">
            <p>{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-brand-900">{pendingOrders.length + activeOrders.length}</p>
              <p className="text-xs text-brand-500">Pending/Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success-600">{completedOrders.length}</p>
              <p className="text-xs text-brand-500">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gold-500">{orders.length}</p>
              <p className="text-xs text-brand-500">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Deliveries */}
        <h2 className="text-lg font-semibold text-brand-900 mb-4">
          {isLoading ? 'Loading orders...' : `Orders (${allDeliveries.length})`}
        </h2>
        <div className="space-y-4">
          {allDeliveries.map((delivery) => (
            <Card key={delivery.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-brand-500" />
                      <span className="font-medium text-brand-900">{delivery.order_number}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-brand-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{delivery.delivery_address}</span>
                    </div>
                    {delivery.delivery_notes && (
                      <div className="flex items-center gap-2 mt-1 text-brand-500 text-xs">
                        <span>Note: {delivery.delivery_notes}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-brand-500 text-xs">
                      <span>Customer: {delivery.customer_name} ({delivery.customer_phone})</span>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(delivery.status)}>
                    {formatStatus(delivery.status)}
                  </Badge>
                </div>

                <div className="flex items-center gap-4">
                  <a
                    href={`tel:${delivery.customer_phone}`}
                    className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800"
                  >
                    <Phone className="w-4 h-4" />
                    Call Customer
                  </a>
                </div>

                <div className="flex gap-2 mt-4">
                  {/* For DELIVERY_REQUEST_STARTED status - confirm rider */}
                  {delivery.status === 'DELIVERY_REQUEST_STARTED' && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(delivery.id)}
                      disabled={actionLoading === delivery.id}
                    >
                      {actionLoading === delivery.id ? 'Confirming...' : 'Accept Order'}
                    </Button>
                  )}
                  {/* For RIDER_CONFIRMED status - start delivery */}
                  {(delivery.status === 'RIDER_CONFIRMED_DIGITAL' || delivery.status === 'RIDER_CONFIRMED_MANUAL') && (
                    <Button
                      size="sm"
                      onClick={() => handleStartDelivery(delivery.id)}
                      disabled={actionLoading === delivery.id}
                    >
                      {actionLoading === delivery.id ? 'Starting...' : 'Start Delivery'}
                    </Button>
                  )}
                  {/* For OUT_FOR_DELIVERY status - complete */}
                  {delivery.status === 'OUT_FOR_DELIVERY' && (
                    <Button
                      size="sm"
                      onClick={() => handleComplete(delivery.id)}
                      disabled={actionLoading === delivery.id}
                    >
                      {actionLoading === delivery.id ? 'Completing...' : 'Mark Delivered'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {allDeliveries.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto text-brand-300 mb-3" />
                <p className="text-brand-500">No pending orders. Check back later!</p>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <RefreshCw className="w-8 h-8 mx-auto text-brand-600 animate-spin mb-3" />
                <p className="text-brand-500">Loading orders...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </Container>
    </div>
  );
}

export function RiderPortalPage() {
  return (
    <AuthGuard requiredRole={['rider', 'admin', 'super-admin']}>
      <RiderPortalContent />
    </AuthGuard>
  );
}

export default RiderPortalPage;
