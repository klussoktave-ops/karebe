// =============================================================================
// Pricing Settings Admin Panel
// Allows admins to configure global pricing settings
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { pricingStore, type PricingSettings } from '../stores/pricing-store';

const DEFAULT_SETTINGS: PricingSettings = {
  base_delivery_fee: { amount: 300, currency: 'KES', label: 'Base Delivery Fee' },
  free_delivery_threshold: { amount: 5000, currency: 'KES', label: 'Free Delivery Threshold' },
  vat_rate: { rate: 0.16, name: 'VAT', label: 'VAT Rate' },
  min_order_amount: { amount: 0, currency: 'KES', label: 'Minimum Order Amount' },
  max_delivery_distance: { distance: 15, unit: 'km', label: 'Max Delivery Distance' }
};

export function PricingSettingsPanel() {
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

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
      [key]: {
        ...prev[key],
        [field]: value
      }
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
      console.error('Failed to save settings:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save pricing settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    setSaveMessage(null);
  };

  // Calculate example totals
  const exampleSubtotal = 4000;
  const exampleVat = exampleSubtotal * settings.vat_rate.rate;
  const exampleIsFreeDelivery = exampleSubtotal >= settings.free_delivery_threshold.amount;
  const exampleDeliveryFee = exampleIsFreeDelivery ? 0 : settings.base_delivery_fee.amount;
  const exampleTotal = exampleSubtotal + exampleVat + exampleDeliveryFee;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pricing Configuration</CardTitle>
          <CardDescription>
            Configure global pricing settings for your store. All amounts are in KES (Kenyan Shillings).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Save message */}
          {saveMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {saveMessage.text}
            </div>
          )}

          {/* Base Delivery Fee */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="baseDeliveryFee">{settings.base_delivery_fee.label}</Label>
              <Input
                id="baseDeliveryFee"
                type="number"
                min={0}
                value={settings.base_delivery_fee.amount}
                onChange={(e) => handleChange('base_delivery_fee', 'amount', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Standard delivery fee when not in a defined zone
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freeThreshold">{settings.free_delivery_threshold.label}</Label>
              <Input
                id="freeThreshold"
                type="number"
                min={0}
                value={settings.free_delivery_threshold.amount}
                onChange={(e) => handleChange('free_delivery_threshold', 'amount', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Orders above this amount get free delivery
              </p>
            </div>
          </div>

          <Separator />

          {/* VAT Rate */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vatRate">{settings.vat_rate.label} (%)</Label>
              <Input
                id="vatRate"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={(settings.vat_rate.rate * 100).toFixed(1)}
                onChange={(e) => handleChange('vat_rate', 'rate', (parseFloat(e.target.value) || 0) / 100)}
              />
              <p className="text-xs text-muted-foreground">
                Value Added Tax rate (currently 16% standard VAT)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minOrder">{settings.min_order_amount.label}</Label>
              <Input
                id="minOrder"
                type="number"
                min={0}
                value={settings.min_order_amount.amount}
                onChange={(e) => handleChange('min_order_amount', 'amount', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum order amount required to place an order
              </p>
            </div>
          </div>

          <Separator />

          {/* Max Delivery Distance */}
          <div className="space-y-2">
            <Label htmlFor="maxDistance">{settings.max_delivery_distance.label}</Label>
            <Input
              id="maxDistance"
              type="number"
              min={1}
              value={settings.max_delivery_distance.distance}
              onChange={(e) => handleChange('max_delivery_distance', 'distance', parseInt(e.target.value) || 15)}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Maximum distance (in km) for delivery service
            </p>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Price Preview</CardTitle>
          <CardDescription>
            See how prices will appear to customers with current settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span>Subtotal (example order)</span>
              <span className="font-medium">KES {exampleSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT ({settings.vat_rate.rate * 100}%)</span>
              <span>KES {exampleVat.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-medium">
                {exampleIsFreeDelivery ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  `KES ${exampleDeliveryFee.toLocaleString()}`
                )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>KES {exampleTotal.toLocaleString()}</span>
            </div>
            {exampleIsFreeDelivery && (
              <p className="text-xs text-green-600 text-center">
                Free delivery applied (above threshold of KES {settings.free_delivery_threshold.amount.toLocaleString()})
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}