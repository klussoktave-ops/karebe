// =============================================================================
// Pricing Settings Admin Panel
// Allows admins to configure global pricing settings and delivery zones
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { pricingStore, type PricingSettings, type DeliveryZone, type DeliveryZoneInput } from '../stores/pricing-store';

const DEFAULT_SETTINGS: PricingSettings = {
  base_delivery_fee: { amount: 300, currency: 'KES', label: 'Base Delivery Fee' },
  free_delivery_threshold: { amount: 5000, currency: 'KES', label: 'Free Delivery Threshold' },
  vat_rate: { rate: 0.16, name: 'VAT', label: 'VAT Rate' },
  min_order_amount: { amount: 0, currency: 'KES', label: 'Minimum Order Amount' },
  max_delivery_distance: { distance: 15, unit: 'km', label: 'Max Delivery Distance' }
};

export function PricingSettingsPanel() {
  return (
    <Tabs defaultValue="settings" className="space-y-4">
      <TabsList>
        <TabsTrigger value="settings">Pricing Settings</TabsTrigger>
        <TabsTrigger value="zones">Delivery Zones</TabsTrigger>
      </TabsList>
      
      <TabsContent value="settings">
        <PricingSettingsTab />
      </TabsContent>
      
      <TabsContent value="zones">
        <DeliveryZonesTab />
      </TabsContent>
    </Tabs>
  );
}

function PricingSettingsTab() {
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await pricingStore.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof PricingSettings, field: string, value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
    setHasChanges(true);
    setSaveMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const success = await pricingStore.updateSettings(settings);
      if (success) {
        setSaveMessage({ type: 'success', text: 'Pricing settings saved successfully' });
        setHasChanges(false);
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save pricing settings' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save pricing settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => { setSettings(DEFAULT_SETTINGS); setHasChanges(true); setSaveMessage(null); };

  const exampleSubtotal = 4000;
  const exampleVat = exampleSubtotal * settings.vat_rate.rate;
  const exampleIsFreeDelivery = exampleSubtotal >= settings.free_delivery_threshold.amount;
  const exampleDeliveryFee = exampleIsFreeDelivery ? 0 : settings.base_delivery_fee.amount;
  const exampleTotal = exampleSubtotal + exampleVat + exampleDeliveryFee;

  if (loading) return <Card><CardContent className="py-8"><div className="text-center text-muted-foreground">Loading settings...</div></CardContent></Card>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pricing Configuration</CardTitle>
          <CardDescription>Configure global pricing settings for your store. All amounts are in KES.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {saveMessage && <div className={`p-3 rounded-lg text-sm ${saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{saveMessage.text}</div>}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="baseDeliveryFee">{settings.base_delivery_fee.label}</Label>
              <Input id="baseDeliveryFee" type="number" min={0} value={settings.base_delivery_fee.amount} onChange={(e) => handleChange('base_delivery_fee', 'amount', parseInt(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Standard delivery fee</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="freeThreshold">{settings.free_delivery_threshold.label}</Label>
              <Input id="freeThreshold" type="number" min={0} value={settings.free_delivery_threshold.amount} onChange={(e) => handleChange('free_delivery_threshold', 'amount', parseInt(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Orders above this get free delivery</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vatRate">{settings.vat_rate.label} (%)</Label>
              <Input id="vatRate" type="number" min={0} max={100} step={0.1} value={(settings.vat_rate.rate * 100).toFixed(1)} onChange={(e) => handleChange('vat_rate', 'rate', (parseFloat(e.target.value) || 0) / 100)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrder">{settings.min_order_amount.label}</Label>
              <Input id="minOrder" type="number" min={0} value={settings.min_order_amount.amount} onChange={(e) => handleChange('min_order_amount', 'amount', parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <Separator />

          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={saving || !hasChanges}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            <Button variant="outline" onClick={handleReset} disabled={saving}>Reset to Defaults</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price Preview</CardTitle>
          <CardDescription>Example order calculation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-medium">KES {exampleSubtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>VAT ({settings.vat_rate.rate * 100}%)</span><span>KES {exampleVat.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Delivery</span><span className="font-medium">{exampleIsFreeDelivery ? <span className="text-green-600">FREE</span> : `KES ${exampleDeliveryFee}`}</span></div>
            <Separator />
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>KES {exampleTotal.toLocaleString()}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DeliveryZonesTab() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<DeliveryZoneInput>({ name: '', branch_id: null, min_distance_km: 0, max_distance_km: 0, fee: 0, is_active: true, sort_order: 0 });

  useEffect(() => { loadZones(); }, []);

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
      setFormData({ name: zone.name, branch_id: zone.branch_id, min_distance_km: zone.min_distance_km, max_distance_km: zone.max_distance_km, fee: zone.fee, is_active: zone.is_active, sort_order: zone.sort_order });
    } else {
      setEditingZone(null);
      setFormData({ name: '', branch_id: null, min_distance_km: 0, max_distance_km: 0, fee: 0, is_active: true, sort_order: zones.length + 1 });
    }
    setDialogOpen(true);
    setMessage(null);
  };

  const handleCloseDialog = () => { setDialogOpen(false); setEditingZone(null); setMessage(null); };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
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
        setMessage({ type: 'success', text: editingZone ? 'Zone updated' : 'Zone created' });
        await loadZones();
        setTimeout(() => handleCloseDialog(), 1000);
      } else {
        setMessage({ type: 'error', text: 'Failed to save zone' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save zone' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this zone?')) return;
    try {
      await pricingStore.deleteZone(id);
      await loadZones();
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

  if (loading) return <Card><CardContent className="py-8"><div className="text-center text-muted-foreground">Loading zones...</div></CardContent></Card>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Delivery Zones</CardTitle>
              <CardDescription>Manage distance-based delivery pricing tiers.</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>Add Zone</Button>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No delivery zones configured.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Distance Range</TableHead>
                  <TableHead>Fee</TableHead>
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
                      <Button variant={zone.is_active ? 'primary' : 'secondary'} size="sm" onClick={() => toggleActive(zone)}>
                        {zone.is_active ? 'Active' : 'Inactive'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(zone)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(zone.id)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Delivery Zone' : 'Add Delivery Zone'}</DialogTitle>
            <DialogDescription>Configure distance range and pricing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {message && <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}
            <div className="space-y-2">
              <Label>Zone Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Zone A - Downtown" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Distance (km)</Label>
                <Input type="number" min={0} value={formData.min_distance_km} onChange={(e) => setFormData(p => ({ ...p, min_distance_km: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Distance (km)</Label>
                <Input type="number" min={0} value={formData.max_distance_km} onChange={(e) => setFormData(p => ({ ...p, max_distance_km: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Delivery Fee (KES)</Label>
              <Input type="number" min={0} value={formData.fee} onChange={(e) => setFormData(p => ({ ...p, fee: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (editingZone ? 'Update' : 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
