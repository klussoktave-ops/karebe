import { useState, useEffect } from 'react';
import { Building2, CreditCard, MapPin, Check, Plus, Trash2, Star, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { BranchMpesaManager, MpesaConfig } from '@/features/admin/services/branch-mpesa-manager';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function BranchConfigPage() {
  const [configs, setConfigs] = useState<MpesaConfig[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newConfig, setNewConfig] = useState({
    branchId: '',
    tillNumber: '',
    businessName: '',
    phoneNumber: '',
    isDefault: false,
    serviceArea: '',
  });

  const mpesaManager = new BranchMpesaManager();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const allConfigs = await mpesaManager.getAllConfigs();
    setConfigs(allConfigs);
  };

  const handleAddConfig = async () => {
    await mpesaManager.setMpesaConfig({
      branchId: newConfig.branchId,
      tillNumber: newConfig.tillNumber,
      businessName: newConfig.businessName,
      phoneNumber: newConfig.phoneNumber,
      isDefault: newConfig.isDefault,
      serviceArea: newConfig.serviceArea.split(',').map(s => s.trim()).filter(Boolean),
    });

    setIsAddDialogOpen(false);
    setNewConfig({
      branchId: '',
      tillNumber: '',
      businessName: '',
      phoneNumber: '',
      isDefault: false,
      serviceArea: '',
    });
    loadConfigs();
  };

  const handleDeactivate = async (branchId: string) => {
    await mpesaManager.deactivateConfig(branchId);
    loadConfigs();
  };

  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Branch Configuration</h1>
                  <p className="text-sm text-gray-500">Manage M-Pesa till numbers per branch</p>
                </div>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Default Config Alert */}
          {configs.filter(c => c.isDefault).length === 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">
                <strong>No default M-Pesa config set.</strong> Please mark one branch as default for fallback.
              </p>
            </div>
          )}

          {/* Configs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configs.map((config) => (
              <Card key={config.branchId} className={config.isDefault ? 'border-2 border-brand-500' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {config.businessName}
                        {config.isDefault && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </CardTitle>
                      <CardDescription>{config.branchId}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      {config.isDefault ? (
                        <Badge className="bg-yellow-100 text-yellow-800">Default</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Till Number */}
                  <div className="flex items-center gap-3 p-3 bg-black text-white rounded-lg">
                    <CreditCard className="h-5 w-5" />
                    <div>
                      <p className="text-xs text-gray-400">Till Number</p>
                      <p className="text-xl font-bold font-mono">
                        {config.tillNumber.replace(/(\d{3})(\d{3})/, '$1 $2')}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    {config.phoneNumber && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="font-medium">Paybill Phone:</span>
                        <span>{config.phoneNumber}</span>
                      </div>
                    )}
                    
                    {config.serviceArea && config.serviceArea.length > 0 && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="font-medium text-gray-600">Service Areas:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {config.serviceArea.map((area) => (
                              <Badge key={area} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!config.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={async () => {
                          await mpesaManager.setMpesaConfig({
                            ...config,
                            isDefault: true,
                          });
                          loadConfigs();
                        }}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeactivate(config.branchId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {configs.length === 0 && (
            <div className="text-center py-16">
              <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No branches configured</h3>
              <p className="text-gray-500 mb-4">
                Add your first branch with its M-Pesa till number
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </div>
          )}
        </main>

        {/* Add Branch Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Branch</DialogTitle>
              <DialogDescription>
                Configure M-Pesa till number for a new branch location
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="branchId">Branch ID</Label>
                <Input
                  id="branchId"
                  placeholder="e.g., branch-westlands"
                  value={newConfig.branchId}
                  onChange={(e) => setNewConfig({ ...newConfig, branchId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Karebe Westlands"
                  value={newConfig.businessName}
                  onChange={(e) => setNewConfig({ ...newConfig, businessName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tillNumber">M-Pesa Till Number</Label>
                <Input
                  id="tillNumber"
                  placeholder="e.g., 123456"
                  value={newConfig.tillNumber}
                  onChange={(e) => setNewConfig({ ...newConfig, tillNumber: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  The till number customers will use for Lipa na M-Pesa
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Paybill Phone Number (Optional)</Label>
                <Input
                  id="phoneNumber"
                  placeholder="e.g., +254712345678"
                  value={newConfig.phoneNumber}
                  onChange={(e) => setNewConfig({ ...newConfig, phoneNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceArea">Service Areas (comma-separated)</Label>
                <Input
                  id="serviceArea"
                  placeholder="e.g., Westlands, Parklands, Riverside"
                  value={newConfig.serviceArea}
                  onChange={(e) => setNewConfig({ ...newConfig, serviceArea: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isDefault"
                  checked={newConfig.isDefault}
                  onCheckedChange={(checked) => 
                    setNewConfig({ ...newConfig, isDefault: checked })
                  }
                />
                <Label htmlFor="isDefault">Set as default branch</Label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddConfig}
                disabled={!newConfig.branchId || !newConfig.tillNumber || !newConfig.businessName}
              >
                <Check className="h-4 w-4 mr-2" />
                Save Branch
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
