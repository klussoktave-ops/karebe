import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  LogOut,
  Store,
  Bell,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getDashboardStats, getOrdersByStatus, Order } from '@/features/orders/api/admin-orders';

function DashboardContent() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    outForDelivery: 0,
    deliveredToday: 0,
  });
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardStats, submittedOrders] = await Promise.all([
        getDashboardStats(),
        getOrdersByStatus('ORDER_SUBMITTED'),
      ]);
      setStats(dashboardStats);
      setNewOrders(submittedOrders.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const dashboardStats = [
    { 
      label: 'Total Orders', 
      value: stats.totalOrders.toString(), 
      icon: ShoppingCart, 
      trend: `${stats.pendingOrders} pending` 
    },
    { 
      label: 'Out for Delivery', 
      value: stats.outForDelivery.toString(), 
      icon: Package, 
      trend: 'Active deliveries' 
    },
    { 
      label: 'Delivered Today', 
      value: stats.deliveredToday.toString(), 
      icon: TrendingUp, 
      trend: 'Completed' 
    },
    { 
      label: 'New Orders', 
      value: newOrders.length.toString(), 
      icon: AlertCircle, 
      trend: 'Need confirmation' 
    },
  ];

  const quickActions = [
    { label: 'Manage Products', icon: Package, onClick: () => navigate('/admin/products') },
    { label: 'View Orders', icon: ShoppingCart, onClick: () => navigate('/admin/orders') },
    { label: 'Manage Branches', icon: Store, onClick: () => navigate('/admin/branches') },
  ];

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Header */}
      <header className="bg-white border-b border-brand-100">
        <Container>
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-display font-bold text-brand-900">
              Admin Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchDashboardData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/admin/orders')}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {newOrders.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white">
                    {newOrders.length}
                  </Badge>
                )}
              </Button>
              <span className="text-brand-600">Welcome, {user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </Container>
      </header>

      <Container className="py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashboardStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-brand-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-brand-900 mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div className="p-2 bg-brand-100 rounded-lg">
                      <Icon className="w-5 h-5 text-brand-600" />
                    </div>
                  </div>
                  <p className="text-sm text-success-600 mt-2">{stat.trend}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={action.onClick}
                  >
                    <Icon className="w-6 h-6" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* New Orders Requiring Action */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>New Orders ({newOrders.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/orders')}>
              View All Orders
            </Button>
          </CardHeader>
          <CardContent>
            {newOrders.length === 0 ? (
              <p className="text-brand-500 text-center py-8">
                No new orders requiring confirmation
              </p>
            ) : (
              <div className="space-y-3">
                {newOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-3 bg-brand-50 rounded-lg hover:bg-brand-100 cursor-pointer transition-colors"
                    onClick={() => navigate('/admin/orders')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <ShoppingCart className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-brand-900">
                          Order #{order.id.slice(-6)}
                        </p>
                        <p className="text-sm text-brand-600">
                          {order.customer_name || order.customer_phone} • KES {order.total_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700">
                        New
                      </Badge>
                      <Button size="sm" onClick={(e) => {
                        e.stopPropagation();
                        navigate('/admin/orders');
                      }}>
                        Confirm
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}

export function AdminDashboardPage() {
  return (
    <AuthGuard requiredRole={['admin', 'super-admin']}>
      <DashboardContent />
    </AuthGuard>
  );
}

export default AdminDashboardPage;
