import { useState, useEffect } from 'react';
import { Phone, MessageCircle, Store, Truck, Save, RefreshCw, Check, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { AuthGuard } from '@/features/auth/components/auth-guard';
import { supabase } from '@/lib/supabase';

interface BusinessSettings {
  business_name: string;
  support_phone: string;
  whatsapp_business_number: string;
  show_prices: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: '',
    support_phone: '',
    whatsapp_business_number: '',
    show_prices: 'true',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((row: { setting_key: string; setting_value: string | null }) => {
        settingsMap[row.setting_key] = row.setting_value || '';
      });

      setSettings({
        business_name: settingsMap.business_name || 'Karebe Wines & Spirits',
        support_phone: settingsMap.support_phone || '',
        whatsapp_business_number: settingsMap.whatsapp_business_number || '',
        show_prices: settingsMap.show_prices || 'true',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { key: 'business_name', value: settings.business_name },
        { key: 'support_phone', value: settings.support_phone },
        { key: 'whatsapp_business_number', value: settings.whatsapp_business_number },
        { key: 'show_prices', value: settings.show_prices },
      ];

      for (const { key, value } of settingsToSave) {
        if (!supabase) continue;
        const from = supabase.from('admin_settings') as any;
        const { error } = await from.upsert(
          { setting_key: key, setting_value: value, updated_at: new Date().toISOString() } as any,
          { onConflict: 'setting_key' }
        );

        if (error) throw error;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard requiredRole="admin">
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 rounded-lg">
                  <Store className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Business Settings</h1>
                  <p className="text-sm text-gray-500">Manage your business configuration</p>
                </div>
              </div>
              <Button onClick={saveSettings} disabled={isSaving}>
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saveSuccess ? 'Saved!' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Business Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Basic business details displayed to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={settings.business_name}
                  onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                  placeholder="Karebe Wines & Spirits"
                />
              </div>
            </CardContent>
          </Card>

          {/* Phone Numbers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Phone Numbers
              </CardTitle>
              <CardDescription>
                Contact numbers for customer support and orders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="support_phone">Support Phone</Label>
                <Input
                  id="support_phone"
                  value={settings.support_phone}
                  onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                  placeholder="+254712345678"
                />
                <p className="text-xs text-gray-500">
                  Main contact number for customer support
                </p>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="whatsapp_business_number" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Business Number
                </Label>
                <Input
                  id="whatsapp_business_number"
                  value={settings.whatsapp_business_number}
                  onChange={(e) => setSettings({ ...settings, whatsapp_business_number: e.target.value })}
                  placeholder="254712345678"
                />
                <p className="text-xs text-gray-500">
                  WhatsApp number for orders (without + prefix)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Price Visibility Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Price Display
              </CardTitle>
              <CardDescription>
                Control whether prices are shown to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="show_prices" className="text-base">
                    Show Prices
                  </Label>
                  <p className="text-sm text-gray-500">
                    When disabled, prices will not be displayed throughout the site
                  </p>
                </div>
                <Switch
                  id="show_prices"
                  checked={settings.show_prices === 'true'}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, show_prices: checked ? 'true' : 'false' })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Branch Configuration Link */}
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Branch Configuration
              </CardTitle>
              <CardDescription>
                Manage branches and M-Pesa till numbers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/admin/branches'}
              >
                Manage Branches
              </Button>
            </CardContent>
          </Card>

          {/* Rider Management Link */}
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Rider Management
              </CardTitle>
              <CardDescription>
                Manage delivery riders and assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/admin/riders'}
              >
                Manage Riders
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
