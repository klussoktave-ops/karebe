// =============================================================================
// Delivery Zones Admin Panel
// Allows admins to manage distance-based delivery pricing
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { pricingStore, type DeliveryZone, type DeliveryZoneInput } from '../stores/pricing-store';

export function DeliveryZonesPanel() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<DeliveryZoneInput>({
    name: '',
    branch_id: null,
    min_distance_km: 0,
    max_distance_km: 0,
    fee: 0,
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    setLoading(true);
    try {
      const data = await pricingStore.getZones();
      setZones(data);
    } catch (error) {
      console.error('Failed to load zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        branch_id: zone.branch_id,
        min_distance_km: zone.min_distance_km,
        max_distance_km: zone.max_distance_km,
        fee: zone.fee,
        is_active: zone.is_active,
        sort_order: zone.sort_order
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        branch_id: null,
        min_distance_km: 0,
        max_distance_km: 0,
        fee: 0,
        is_active: true,
        sort_order: zones.length + 1
      });
    }
    setDialogOpen(true);
    setMessage(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingZone(null);
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    // Validate
    if (!formData.name || formData.min_distance_km < 0 || formData.max_distance_km <= formData.min_distance_km || formData.fee < 0) {
      setMessage({ type: 'error', text: 'Please fill in all fields correctly' });
      setSaving(false);
      return;
    }

    try {
      let success = false;
      if (editingZone) {
        success = await pricingStore.updateZone(editingZone.id, formData);
      } else {
        const result = await pricingStore.createZone(formData);
        success = !!result;
      }

      if (success) {
        setMessage({ type: 'success', text: editingZone ? 'Zone updated successfully' : 'Zone created successfully' });
        await loadZones();
        setTimeout(() => handleCloseDialog(), 1000);
      } else {
        setMessage({ type: 'error', text: 'Failed to save zone' });
      }
    } catch (error) {
      console.error('Failed to save zone:', error);
      setMessage({ type: 'error', text: 'Failed to save zone' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;

    try {
      const success = await pricingStore.deleteZone(id);
      if (success) {
        await loadZones();
      } else {
        alert('Failed to delete zone');
      }
    } catch (error) {
      console.error('Failed to delete zone:', error);
    }
  };

  const toggleActive = async (zone: DeliveryZone) => {
    try {
      await pricingStore.updateZone(zone.id, { is_active: !zone.is_active });
      await loadZones();
    } catch (error) {
      console.error('Failed to toggle zone:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading zones...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Delivery Zones</CardTitle>
              <CardDescription>
                Manage distance-based delivery pricing tiers. Customers within each zone will be charged the corresponding fee.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>Add Zone</Button>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No delivery zones configured. Add zones to enable distance-based delivery pricing.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Distance Range</TableHead>
                  <TableHead>Delivery Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell>{zone.min_distance_km} - {zone.max_distance_km} km</TableCell>
                    <TableCell>KES {zone.fee.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant={zone.is_active ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => toggleActive(zone)}
                      >
                        {zone.is_active ? 'Active' : 'Inactive'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(zone)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(zone.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Zone Creation/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Delivery Zone' : 'Add Delivery Zone'}</DialogTitle>
            <DialogDescription>
              Configure a delivery zone with distance range and pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="zoneName">Zone Name</Label>
              <Input
                id="zoneName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Zone A - Downtown"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minDistance">Min Distance (km)</Label>
                <Input
                  id="minDistance"
                  type="number"
                  min={0}
                  value={formData.min_distance_km}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_distance_km: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDistance">Max Distance (km)</Label>
                <Input
                  id="maxDistance"
                  type="number"
                  min={0}
                  value={formData.max_distance_km}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_distance_km: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fee">Delivery Fee (KES)</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                value={formData.fee}
                onChange={(e) => setFormData(prev => ({ ...prev, fee: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                min={0}
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Zones are checked in order - first matching zone is used
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (editingZone ? 'Update Zone' : 'Create Zone')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}