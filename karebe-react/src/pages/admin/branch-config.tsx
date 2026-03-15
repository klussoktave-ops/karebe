import { useState, useEffect } from 'react';
import { Building2, CreditCard, MapPin, Check, Plus, Trash2, Star, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { supabase } from '@/lib/supabase';

// Railway API URL - use environment variable with fallback
const ORCHESTRATION_API = import.meta.env.VITE_ORCHESTRATION_API_URL || 'https://karebe-orchestration-production.up.railway.app';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_main: boolean;
  is_active: boolean;
  mpesa_shortcode: string;
  mpesa_payment_type: 'buy_goods' | 'stk_push' | 'both';
}

export default function BranchConfigPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [newBranch, setNewBranch] = useState({
    id: '',
    name: '',
    address: '',
    phone: '',
    is_main: false,
    mpesa_shortcode: '',
    mpesa_payment_type: 'buy_goods' as const,
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setIsLoading(true);
      // Use Railway orchestration API
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/branches`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load branches');
      }
      
      const sortedData = (result.data || []).sort((a: any, b: any) => {
        if (a.is_main && !b.is_main) return -1;
        if (!a.is_main && b.is_main) return 1;
        return a.name.localeCompare(b.name);
      });
      setBranches(sortedData);
    } catch (error) {
      console.error('Failed to load branches:', error);
      setBranches([
        { id: 'main-branch', name: 'Main Branch', address: '123 Main St, Nairobi', phone: '+254712345678', is_main: true, is_active: true, mpesa_shortcode: '9137883', mpesa_payment_type: 'buy_goods' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBranch = async () => {
    try {
      // Use Railway orchestration API
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBranch.name,
          address: newBranch.address,
          phone: newBranch.phone,
          is_main: newBranch.is_main,
          mpesa_shortcode: newBranch.mpesa_shortcode,
          mpesa_payment_type: newBranch.mpesa_payment_type,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add branch');
      }

      setIsAddDialogOpen(false);
      setNewBranch({ id: '', name: '', address: '', phone: '', is_main: false, mpesa_shortcode: '', mpesa_payment_type: 'buy_goods' });
      loadBranches();
    } catch (error) {
      console.error('Failed to add branch:', error);
      alert('Failed to add branch. Please try again.');
    }
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch) return;
    
    try {
      // Use Railway orchestration API
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/branches`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingBranch.id,
          name: editingBranch.name,
          address: editingBranch.address,
          phone: editingBranch.phone,
          is_main: editingBranch.is_main,
          mpesa_shortcode: editingBranch.mpesa_shortcode,
          mpesa_payment_type: editingBranch.mpesa_payment_type,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update branch');
      }

      setEditingBranch(null);
      loadBranches();
    } catch (error) {
      console.error('Failed to update branch:', error);
      alert('Failed to update branch. Please try again.');
    }
  };

  const handleSetMain = async (branchId: string) => {
    try {
      // Use Railway orchestration API
      await fetch(`${ORCHESTRATION_API}/api/admin/branches`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: branchId, is_main: true }),
      });
      // Reset other branches' is_main to false
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/branches`);
      const result = await response.json();
      if (result.success && result.data) {
        for (const branch of result.data) {
          if (branch.id !== branchId && branch.is_main) {
            await fetch(`${ORCHESTRATION_API}/api/admin/branches`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: branch.id, is_main: false }),
            });
          }
        }
      }
      loadBranches();
    } catch (error) {
      console.error('Failed to set main branch:', error);
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    try {
      // Use Railway orchestration API
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/branches`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: branchId }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete branch');
      }
      loadBranches();
    } catch (error) {
      console.error('Failed to delete branch:', error);
    }
  };

  const handleToggleActive = async (branch: Branch) => {
    try {
      // Use Railway orchestration API
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/branches`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: branch.id, is_active: !branch.is_active }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle branch status');
      }
      loadBranches();
      if (error) throw error;
      loadBranches();
    } catch (error) {
      console.error('Failed to toggle branch status:', error);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Branch Configuration</h1>
                  <p className="text-sm text-gray-500">Manage branches and M-Pesa till numbers</p>
                </div>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!branches.some(b => b.is_main) && branches.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">
                <strong>No main branch set.</strong> Please mark one branch as main for fallback.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <Card key={branch.id} className={branch.is_main ? 'border-2 border-brand-500' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {branch.name}
                        {branch.is_main && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {branch.address || 'No address'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      {branch.is_main ? (
                        <Badge className="bg-yellow-100 text-yellow-800">Main</Badge>
                      ) : branch.is_active ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {branch.mpesa_shortcode && (
                    <div className="flex items-center gap-3 p-3 bg-black text-white rounded-lg">
                      <CreditCard className="h-5 w-5" />
                      <div>
                        <p className="text-xs text-gray-400">Till Number</p>
                        <p className="text-xl font-bold font-mono">
                          {branch.mpesa_shortcode.replace(/(\d{3})(\d{3})/, '$1 $2')}
                        </p>
                      </div>
                    </div>
                  )}

                  {branch.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Phone:</span>
                      <span>{branch.phone}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    {!branch.is_main && (
                      <Button variant="outline" size="sm" onClick={() => handleSetMain(branch.id)}>
                        <Star className="h-4 w-4 mr-1" />
                        Set Main
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setEditingBranch(branch)}>
                      <Save className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(branch)}>
                      {branch.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteBranch(branch.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {branches.length === 0 && (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No branches configured</h3>
              <p className="text-gray-500 mb-4">Add your first branch with its M-Pesa till number</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </div>
          )}
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Branch</DialogTitle>
              <DialogDescription>Configure a new branch location with M-Pesa till number</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="branchId">Branch ID (optional)</Label>
                <Input
                  id="branchId"
                  placeholder="Auto-generated if empty"
                  value={newBranch.id}
                  onChange={(e) => setNewBranch({ ...newBranch, id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Branch Name *</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Karebe Westlands"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="e.g., Westlands, Nairobi"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="e.g., +254712345678"
                  value={newBranch.phone}
                  onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tillNumber">M-Pesa Till Number</Label>
                <Input
                  id="tillNumber"
                  placeholder="e.g., 123456"
                  value={newBranch.mpesa_shortcode}
                  onChange={(e) => setNewBranch({ ...newBranch, mpesa_shortcode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>M-Pesa Payment Type</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="buy_goods"
                      checked={newBranch.mpesa_payment_type === 'buy_goods'}
                      onChange={() => setNewBranch({ ...newBranch, mpesa_payment_type: 'buy_goods' })}
                    />
                    <span className="text-sm">Buy Goods</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="stk_push"
                      checked={newBranch.mpesa_payment_type === 'stk_push'}
                      onChange={() => setNewBranch({ ...newBranch, mpesa_payment_type: 'stk_push' })}
                    />
                    <span className="text-sm">STK Push</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="both"
                      checked={newBranch.mpesa_payment_type === 'both'}
                      onChange={() => setNewBranch({ ...newBranch, mpesa_payment_type: 'both' })}
                    />
                    <span className="text-sm">Both</span>
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isMain"
                  checked={newBranch.is_main}
                  onCheckedChange={(checked) => setNewBranch({ ...newBranch, is_main: checked })}
                />
                <Label htmlFor="isMain">Set as main branch</Label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAddBranch} disabled={!newBranch.name}>
                <Check className="h-4 w-4 mr-2" />
                Save Branch
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingBranch} onOpenChange={(open) => !open && setEditingBranch(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Branch</DialogTitle>
              <DialogDescription>Update branch details</DialogDescription>
            </DialogHeader>
            {editingBranch && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Branch Name *</Label>
                  <Input
                    id="editName"
                    value={editingBranch.name}
                    onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAddress">Address</Label>
                  <Input
                    id="editAddress"
                    value={editingBranch.address}
                    onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Phone Number</Label>
                  <Input
                    id="editPhone"
                    value={editingBranch.phone}
                    onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editTill">M-Pesa Till Number</Label>
                  <Input
                    id="editTill"
                    value={editingBranch.mpesa_shortcode}
                    onChange={(e) => setEditingBranch({ ...editingBranch, mpesa_shortcode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>M-Pesa Payment Type</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editPaymentType"
                        value="buy_goods"
                        checked={!editingBranch.mpesa_payment_type || editingBranch.mpesa_payment_type === 'buy_goods'}
                        onChange={() => setEditingBranch({ ...editingBranch, mpesa_payment_type: 'buy_goods' })}
                      />
                      <span className="text-sm">Buy Goods</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editPaymentType"
                        value="stk_push"
                        checked={editingBranch.mpesa_payment_type === 'stk_push'}
                        onChange={() => setEditingBranch({ ...editingBranch, mpesa_payment_type: 'stk_push' })}
                      />
                      <span className="text-sm">STK Push</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="editPaymentType"
                        value="both"
                        checked={editingBranch.mpesa_payment_type === 'both'}
                        onChange={() => setEditingBranch({ ...editingBranch, mpesa_payment_type: 'both' })}
                      />
                      <span className="text-sm">Both</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="editIsMain"
                    checked={editingBranch.is_main}
                    onCheckedChange={(checked) => setEditingBranch({ ...editingBranch, is_main: checked })}
                  />
                  <Label htmlFor="editIsMain">Set as main branch</Label>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditingBranch(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUpdateBranch} disabled={!editingBranch?.name}>
                <Check className="h-4 w-4 mr-2" />
                Update Branch
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
