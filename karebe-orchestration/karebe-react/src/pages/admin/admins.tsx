import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Edit2, ToggleLeft, ToggleRight, UserCog, Building2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import { supabase } from '@/lib/supabase';

// Railway API URL - use environment variable with fallback
const ORCHESTRATION_API = import.meta.env.VITE_ORCHESTRATION_API_URL || 'https://karebe-orchestration-production.up.railway.app';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'super-admin';
  branch_id?: string;
  is_active: boolean;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
}

export default function AdminsPage() {
  const { user } = useAuthStore();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'admin' as const,
    branch_id: '',
  });

  const isSuperAdmin = user?.role === 'super-admin';

  useEffect(() => {
    loadAdmins();
    loadBranches();
  }, []);

  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      // Use Railway orchestration API
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/admins`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load admins');
      }
      
      setAdmins(result.data || []);
    } catch (error) {
      console.error('Failed to load admins:', error);
      // Fallback to demo data
      setAdmins([
        { id: '1', email: 'owner@karebe.com', name: 'John Karebe', phone: '+254712345678', role: 'super-admin', is_active: true, created_at: new Date().toISOString() },
        { id: '2', email: 'admin@karebe.com', name: 'Grace Muthoni', phone: '+254723456789', role: 'admin', branch_id: 'branch-wangige', is_active: true, created_at: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Failed to load branches:', error);
      setBranches([
        { id: 'branch-wangige', name: 'Wangige Main' },
        { id: 'branch-karura', name: 'Karura Branch' },
      ]);
    }
  };

  const handleAddAdmin = async () => {
    try {
      // Use Railway orchestration API
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newAdmin.email,
          password: newAdmin.password,
          name: newAdmin.name,
          phone: newAdmin.phone || null,
          role: newAdmin.role,
          branch_id: newAdmin.branch_id || null,
          is_active: true,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        if (response.status === 409) {
          alert('An admin with this email already exists');
          return;
        }
        throw new Error(result.error || 'Failed to add admin');
      }

      setIsAddDialogOpen(false);
      setNewAdmin({ email: '', password: '', name: '', phone: '', role: 'admin', branch_id: '' });
      loadAdmins();
    } catch (error) {
      console.error('Failed to add admin:', error);
      alert('Failed to add admin. Please try again.');
    }
  };

  const handleUpdateAdmin = async () => {
    if (!editingAdmin) return;
    
    try {
      // Use Railway orchestration API
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/admins`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingAdmin.id,
          name: editingAdmin.name,
          phone: editingAdmin.phone,
          role: editingAdmin.role,
          branch_id: editingAdmin.branch_id || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update admin');
      }

      setEditingAdmin(null);
      loadAdmins();
    } catch (error) {
      console.error('Failed to update admin:', error);
      alert('Failed to update admin. Please try again.');
    }
  };

  const handleToggleActive = async (admin: AdminUser) => {
    try {
      // Use Railway orchestration API
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/admins`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: admin.id,
          is_active: !admin.is_active,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle admin status');
      }

      loadAdmins();
    } catch (error) {
      console.error('Failed to toggle admin status:', error);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    console.log('[AdminDelete] Attempting to delete admin:', { adminId, url: `${ORCHESTRATION_API}/api/admin/admins/${adminId}` });
    if (!confirm('Are you sure you want to delete this admin?')) return;
    try {
      // Use Railway orchestration API - ID goes in URL path
      const response = await fetch(`${ORCHESTRATION_API}/api/admin/admins/${adminId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete admin');
      }

      loadAdmins();
    } catch (error) {
      console.error('Failed to delete admin:', error);
    }
  };

  if (!isSuperAdmin) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-500">Only super admins can manage other admins.</p>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    );
  }

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
                  <UserCog className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Management</h1>
                  <p className="text-sm text-gray-500">Manage admin users and permissions</p>
                </div>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {admins.map((admin) => (
              <Card key={admin.id} className={admin.is_active ? '' : 'opacity-60'}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {admin.name}
                        {admin.role === 'super-admin' && (
                          <Shield className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-500">{admin.email}</p>
                    </div>
                    <Badge className={admin.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {admin.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Phone:</span>
                      <span>{admin.phone}</span>
                    </div>
                  )}

                  {admin.branch_id && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4" />
                      <span>{branches.find(b => b.id === admin.branch_id)?.name || admin.branch_id}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Role:</span>
                    <Badge variant="outline">{admin.role}</Badge>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingAdmin(admin)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(admin)}>
                      {admin.is_active ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteAdmin(admin.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {admins.length === 0 && (
            <div className="text-center py-16">
              <UserCog className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No admins configured</h3>
              <p className="text-gray-500 mb-4">Add your first admin user</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </div>
          )}
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
              <DialogDescription>Create a new admin user account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="adminName">Full Name *</Label>
                <Input
                  id="adminName"
                  placeholder="e.g., John Doe"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="e.g., john@karebe.com"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Enter password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPhone">Phone Number</Label>
                <Input
                  id="adminPhone"
                  placeholder="e.g., +254712345678"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminRole">Role</Label>
                <select
                  id="adminRole"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as 'admin' | 'super-admin' })}
                >
                  <option value="admin">Admin</option>
                  <option value="super-admin">Super Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminBranch">Branch (Optional)</Label>
                <select
                  id="adminBranch"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={newAdmin.branch_id}
                  onChange={(e) => setNewAdmin({ ...newAdmin, branch_id: e.target.value })}
                >
                  <option value="">No branch assigned</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleAddAdmin} 
                disabled={!newAdmin.name || !newAdmin.email || !newAdmin.password}
              >
                <Check className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingAdmin} onOpenChange={(open) => !open && setEditingAdmin(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Admin</DialogTitle>
              <DialogDescription>Update admin user details</DialogDescription>
            </DialogHeader>
            {editingAdmin && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editAdminName">Full Name *</Label>
                  <Input
                    id="editAdminName"
                    value={editingAdmin.name}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAdminEmail">Email</Label>
                  <Input id="editAdminEmail" value={editingAdmin.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAdminPhone">Phone Number</Label>
                  <Input
                    id="editAdminPhone"
                    value={editingAdmin.phone || ''}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAdminRole">Role</Label>
                  <select
                    id="editAdminRole"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={editingAdmin.role}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, role: e.target.value as 'admin' | 'super-admin' })}
                  >
                    <option value="admin">Admin</option>
                    <option value="super-admin">Super Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAdminBranch">Branch</Label>
                  <select
                    id="editAdminBranch"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={editingAdmin.branch_id || ''}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, branch_id: e.target.value })}
                  >
                    <option value="">No branch assigned</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditingAdmin(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUpdateAdmin} disabled={!editingAdmin?.name}>
                <Check className="h-4 w-4 mr-2" />
                Update Admin
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
