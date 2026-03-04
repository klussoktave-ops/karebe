import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  MapPin, 
  CheckCircle, 
  LogOut, 
  Phone,
  Navigation,
  Clock
} from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { useAuth } from '@/features/auth/hooks/use-auth';

function RiderPortalContent() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeDeliveries, setActiveDeliveries] = useState([
    { id: '1', orderNumber: 'ORD-001', address: '123 Main St, Nairobi', status: 'pending', customerPhone: '+254712345678' },
    { id: '2', orderNumber: 'ORD-002', address: '456 Park Ave, Nairobi', status: 'picked_up', customerPhone: '+254723456789' },
  ]);

  const updateStatus = (deliveryId: string, newStatus: string) => {
    setActiveDeliveries(prev =>
      prev.map(d => d.id === deliveryId ? { ...d, status: newStatus } : d)
    );
  };

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
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </Container>
      </header>

      <Container className="py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-brand-900">{activeDeliveries.length}</p>
              <p className="text-xs text-brand-500">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success-600">12</p>
              <p className="text-xs text-brand-500">Completed Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gold-500">KES 2,400</p>
              <p className="text-xs text-brand-500">Earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Deliveries */}
        <h2 className="text-lg font-semibold text-brand-900 mb-4">Active Deliveries</h2>
        <div className="space-y-4">
          {activeDeliveries.map((delivery) => (
            <Card key={delivery.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-brand-500" />
                      <span className="font-medium text-brand-900">{delivery.orderNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-brand-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{delivery.address}</span>
                    </div>
                  </div>
                  <Badge variant={delivery.status === 'pending' ? 'warning' : 'info'}>
                    {delivery.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center gap-4">
                  <a
                    href={`tel:${delivery.customerPhone}`}
                    className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800"
                  >
                    <Phone className="w-4 h-4" />
                    Call Customer
                  </a>
                </div>

                <div className="flex gap-2 mt-4">
                  {delivery.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(delivery.id, 'picked_up')}
                    >
                      <Package className="w-4 h-4 mr-1" />
                      Mark Picked Up
                    </Button>
                  )}
                  {delivery.status === 'picked_up' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(delivery.id, 'delivered')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Delivered
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {activeDeliveries.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto text-brand-300 mb-3" />
                <p className="text-brand-500">No active deliveries</p>
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
    <AuthGuard requiredRole="rider">
      <RiderPortalContent />
    </AuthGuard>
  );
}

export default RiderPortalPage;
