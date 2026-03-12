// Pricing Settings Store - Updated for Railway orchestration API
// Uses VITE_ORCHESTRATION_API_URL environment variable with fallback to Railway production
import { supabase } from '@/lib/supabase';

const ORCHESTRATION_API = import.meta.env.VITE_ORCHESTRATION_API_URL || 'https://karebe-orchestration-production.up.railway.app';

export interface PricingSettings {
  base_delivery_fee: { amount: number; currency: string; label: string };
  free_delivery_threshold: { amount: number; currency: string; label: string };
  vat_rate: { rate: number; name: string; label: string };
  min_order_amount: { amount: number; currency: string; label: string };
  max_delivery_distance: { distance: number; unit: string; label: string };
}

export interface DeliveryZone {
  id: string; name: string; branch_id: string | null;
  min_distance_km: number; max_distance_km: number; fee: number;
  is_active: boolean; sort_order: number; created_at: string; updated_at: string;
}

export interface DeliveryZoneInput {
  name: string; branch_id?: string | null; min_distance_km: number;
  max_distance_km: number; fee: number; is_active?: boolean; sort_order?: number;
}

const DEFAULT_SETTINGS: PricingSettings = {
  base_delivery_fee: { amount: 300, currency: 'KES', label: 'Base Delivery Fee' },
  free_delivery_threshold: { amount: 5000, currency: 'KES', label: 'Free Delivery Threshold' },
  vat_rate: { rate: 0.16, name: 'VAT', label: 'VAT Rate' },
  min_order_amount: { amount: 0, currency: 'KES', label: 'Minimum Order Amount' },
  max_delivery_distance: { distance: 15, unit: 'km', label: 'Max Delivery Distance' }
};

let settingsCache: PricingSettings | null = null;
let zonesCache: DeliveryZone[] | null = null;

async function getAuthHeader() {
  const session = await supabase.auth.getSession();
  return { 'Authorization': `Bearer ${session.data.session?.access_token}` };
}

function getApiUrl(path: string) {
  return `${ORCHESTRATION_API}${path}`;
}

export const pricingStore = {
  async getSettings(forceRefresh = false): Promise<PricingSettings> {
    if (settingsCache && !forceRefresh) return settingsCache;
    try {
      const response = await fetch(getApiUrl('/api/pricing/settings'), { headers: await getAuthHeader() });
      const result = await response.json();
      if (result.ok && result.data) { settingsCache = result.data; return result.data; }
      return DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  },

  async updateSettings(settings: Partial<PricingSettings>): Promise<boolean> {
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
      const response = await fetch(getApiUrl('/api/pricing/settings'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...await getAuthHeader() },
        body: JSON.stringify({ settings: updates })
      });
      const result = await response.json();
      if (result.ok) { settingsCache = null; return true; }
      return false;
    } catch { return false; }
  },

  async getZones(forceRefresh = false): Promise<DeliveryZone[]> {
    if (zonesCache && !forceRefresh) return zonesCache;
    try {
      const response = await fetch(getApiUrl('/api/pricing/zones?active=true'), { headers: await getAuthHeader() });
      const result = await response.json();
      if (result.ok && result.data) { zonesCache = result.data; return result.data; }
      return [];
    } catch { return []; }
  },

  async createZone(zone: DeliveryZoneInput): Promise<DeliveryZone | null> {
    try {
      const response = await fetch(getApiUrl('/api/pricing/zones'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...await getAuthHeader() },
        body: JSON.stringify(zone)
      });
      const result = await response.json();
      if (result.ok && result.data) { zonesCache = null; return result.data; }
      return null;
    } catch { return null; }
  },

  async updateZone(id: string, updates: Partial<DeliveryZoneInput>): Promise<boolean> {
    try {
      const response = await fetch(getApiUrl('/api/pricing/zones'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...await getAuthHeader() },
        body: JSON.stringify({ id, ...updates })
      });
      const result = await response.json();
      if (result.ok) { zonesCache = null; return true; }
      return false;
    } catch { return false; }
  },

  async deleteZone(id: string): Promise<boolean> {
    try {
      const response = await fetch(getApiUrl('/api/pricing/zones'), {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', ...await getAuthHeader() },
        body: JSON.stringify({ id })
      });
      const result = await response.json();
      if (result.ok) { zonesCache = null; return true; }
      return false;
    } catch { return false; }
  },

  async getDeliveryFeeForDistance(distanceKm: number, subtotal = 0): Promise<{ fee: number; isFree: boolean; zone: string; threshold: number }> {
    try {
      const params = new URLSearchParams({ distance: distanceKm.toString(), subtotal: subtotal.toString() });
      const response = await fetch(getApiUrl(`/api/pricing/calculate?${params}`));
      const result = await response.json();
      if (result.ok && result.data) {
        return { fee: result.data.delivery_fee, isFree: result.data.is_free_delivery, zone: result.data.zone, threshold: result.data.free_delivery_threshold };
      }
      return { fee: 300, isFree: subtotal >= 5000, zone: 'Standard', threshold: 5000 };
    } catch { return { fee: 300, isFree: subtotal >= 5000, zone: 'Standard', threshold: 5000 }; }
  },

  clearCache() { settingsCache = null; zonesCache = null; }
};
