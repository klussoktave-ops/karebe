import { useState, useEffect } from 'react';
import { Truck, Plus, Phone, Search, MoreVertical, Trash2, Edit, Check, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { supabase } from '@/lib/supabase';

// Extended Rider interface with status field needed by UI
interface RiderWithStatus {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  whatsapp_number: string | null;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
  status?: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function RidersPage() {
  const [riders, setRiders] = useState<RiderWithStatus[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<RiderWithStatus | null>(null);
  const [newRider, setNewRider] = useState({
    name: '',
    phone: '',
    whatsapp_number: '',
    branch_id: '',
  });

  useEffect(() => {
    loadRiders();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const { data } = await supabase.from('branches').select('id, name').order('name');
      setBranches(data || []);
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadRiders = async () => {
    try {
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setRiders(data || []);
    } catch (error) {
      console.error('Failed to load riders:', error);
      // Try to load from demo data if table doesn't exist
      setRiders([
        { id: 'rider-001', full_name: 'John Doe', phone: '+254712345678', whatsapp_number: '+254712345678', branch_id: null, status: 'AVAILABLE', is_active: true, user_id: null, created_at: new Date().toISOString() },
        { id: 'rider-002', full_name: 'Jane Smith', phone: '+254723456789', whatsapp_number: '+254723456789', branch_id: null, status: 'BUSY', is_active: true, user_id: null, created_at: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRider = async () => {
    try {
      const riderId = 'rider-' + Date.now();
      const { error } = await supabase.from('riders').insert({
        id: riderId,
        full_name: newRider.name,
        phone: newRider.phone,
        whatsapp_number: newRider.whatsapp_number,
        branch_id: newRider.branch_id || null,
        status: 'AVAILABLE',
        is_active: true,
      });

      if (error) throw error;

      setIsAddDialogOpen(false);
      setNewRider({ name: '', phone: '', whatsapp_number: '', branch_id: '' });
      loadRiders();
    } catch (error) {
      console.error('Failed to add rider:', error);
      alert('Failed to add rider. Please try again.');
    }
  };

  const handleToggleStatus = async (rider: Rider) => {
    try {
      const { error } = await supabase
        .from('riders')
        .update({ is_active: !rider.is_active })
        .eq('id', rider.id);

      if (error) throw error;
      loadRiders();
    } catch (error) {
      console.error('Failed to toggle rider status:', error);
    }
  };

  const handleDeleteRider = async (riderId: string) => {
    if (!confirm('Are you sure you want to delete this rider?')) return;

    try {
      const { error } = await supabase.from('riders').delete().eq('id', riderId);
      if (error) throw error;
      loadRiders();
    } catch (error) {
      console.error('Failed to delete rider:', error);
    }
  };

  const filteredRiders = riders.filter((rider) =>
    rider.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rider.phone.includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>;
      case 'BUSY':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Busy</Badge>;
      case 'OFFLINE':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Offline</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AuthGuard requiredRole={['admin', 'super-admin']}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={['admin', 'super-admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 rounded-lg">
                  <Truck className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Rider Management</h1>
                  <p className="text-sm text-gray-500">Manage delivery riders and assignments</p>
                </div>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rider
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search riders by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Riders Grid */}
          {filteredRiders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No riders found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Try a different search term' : 'Add your first rider to get started'}
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rider
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRiders.map((rider) => (
                <Card key={rider.id} className={!rider.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{rider.full_name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {rider.phone}
                        </CardDescription>
                      </div>
                      {getStatusBadge(rider.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={rider.is_active ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleStatus(rider)}
                        >
                          {rider.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRider(rider.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* Add Rider Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Rider</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rider-name">Name</Label>
                <Input
                  id="rider-name"
                  value={newRider.name}
                  onChange={(e) => setNewRider({ ...newRider, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rider-phone">Phone Number</Label>
                <Input
                  id="rider-phone"
                  value={newRider.phone}
                  onChange={(e) => setNewRider({ ...newRider, phone: e.target.value })}
                  placeholder="+254712345678"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rider-whatsapp">WhatsApp Number (Optional)</Label>
                <Input
                  id="rider-whatsapp"
                  value={newRider.whatsapp_number}
                  onChange={(e) => setNewRider({ ...newRider, whatsapp_number: e.target.value })}
                  placeholder="254712345678"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rider-branch">Branch (Optional)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    id="rider-branch"
                    value={newRider.branch_id}
                    onChange={(e) => setNewRider({ ...newRider, branch_id: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border rounded-md"
                  >
                    <option value="">No branch assigned</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRider} disabled={!newRider.name || !newRider.phone}>
                Add Rider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
