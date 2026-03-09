// =============================================================================
// Pricing Settings Store
// Manages pricing configuration and delivery zones state
// =============================================================================

import { supabase } from '@/lib/supabase';

export interface PricingSettings {
  base_delivery_fee: {
    amount: number;
    currency: string;
    label: string;
  };
  free_delivery_threshold: {
    amount: number;
    currency: string;
    label: string;
  };
  vat_rate: {
    rate: number;
    name: string;
    label: string;
  };
  min_order_amount: {
    amount: number;
    currency: string;
    label: string;
  };
  max_delivery_distance: {
    distance: number;
    unit: string;
    label: string;
  };
}

export interface DeliveryZone {
  id: string;
  name: string;
  branch_id: string | null;
  min_distance_km: number;
  max_distance_km: number;
  fee: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryZoneInput {
  name: string;
  branch_id?: string | null;
  min_distance_km: number;
  max_distance_km: number;
  fee: number;
  is_active?: boolean;
  sort_order?: number;
}

const DEFAULT_SETTINGS: PricingSettings = {
  base_delivery_fee: { amount: 300, currency: 'KES', label: 'Base Delivery Fee' },
  free_delivery_threshold: { amount: 5000, currency: 'KES', label: 'Free Delivery Threshold' },
  vat_rate: { rate: 0.16, name: 'VAT', label: 'VAT Rate' },
  min_order_amount: { amount: 0, currency: 'KES', label: 'Minimum Order Amount' },
  max_delivery_distance: { distance: 15, unit: 'km', label: 'Max Delivery Distance' }
};

// Cache for pricing settings
let settingsCache: PricingSettings | null = null;
let zonesCache: DeliveryZone[] | null = null;

export const pricingStore = {
  /**
   * Fetch all pricing settings from API
   */
  async getSettings(forceRefresh = false): Promise<PricingSettings> {
    if (settingsCache && !forceRefresh) {
      return settingsCache;
    }

    try {
      const response = await fetch('/api/admin/pricing-settings', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      
      const result = await response.json();
      
      if (result.ok && result.data) {
        settingsCache = result.data;
        return result.data;
      }
      
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to fetch pricing settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Update pricing settings
   */
  async updateSettings(settings: Partial<PricingSettings>): Promise<boolean> {
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value
      }));

      const response = await fetch('/api/admin/pricing-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ settings: updates })
      });

      const result = await response.json();
      
      if (result.ok) {
        settingsCache = null; // Clear cache
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update pricing settings:', error);
      return false;
    }
  },

  /**
   * Fetch all delivery zones
   */
  async getZones(forceRefresh = false): Promise<DeliveryZone[]> {
    if (zonesCache && !forceRefresh) {
      return zonesCache;
    }

    try {
      const response = await fetch('/api/admin/delivery-zones?active=true', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      
      const result = await response.json();
      
      if (result.ok && result.data) {
        zonesCache = result.data;
        return result.data;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch delivery zones:', error);
      return [];
    }
  },

  /**
   * Create a new delivery zone
   */
  async createZone(zone: DeliveryZoneInput): Promise<DeliveryZone | null> {
    try {
      const response = await fetch('/api/admin/delivery-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(zone)
      });
      
      const result = await response.json();
      
      if (result.ok && result.data) {
        zonesCache = null; // Clear cache
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to create delivery zone:', error);
      return null;
    }
  },

  /**
   * Update a delivery zone
   */
  async updateZone(id: string, updates: Partial<DeliveryZoneInput>): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/delivery-zones', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ id, ...updates })
      );
      
      const result = await response.json();
      
      if (result.ok) {
        zonesCache = null; // Clear cache
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update delivery zone:', error);
      return false;
    }
  },

  /**
   * Delete a delivery zone
   */
  async deleteZone(id: string): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/delivery-zones', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ id })
      );
      
      const result = await response.json();
      
      if (result.ok) {
        zonesCache = null; // Clear cache
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete delivery zone:', error);
      return false;
    }
  },

  /**
   * Get delivery fee for a specific distance
   */
  async getDeliveryFeeForDistance(distanceKm: number, subtotal = 0): Promise<{
    fee: number;
    isFree: boolean;
    zone: string;
    threshold: number;
  }> {
    try {
      const params = new URLSearchParams({
        distance: distanceKm.toString(),
        subtotal: subtotal.toString()
      });

      const response = await fetch(`/api/pricing?${params}`);
      const result = await response.json();
      
      if (result.ok && result.data) {
        return {
          fee: result.data.delivery_fee,
          isFree: result.data.is_free_delivery,
          zone: result.data.zone,
          threshold: result.data.free_delivery_threshold
        };
      }
      
      // Return defaults
      return {
        fee: 300,
        isFree: subtotal >= 5000,
        zone: 'Standard',
        threshold: 5000
      };
    } catch (error) {
      console.error('Failed to get delivery fee:', error);
      return {
        fee: 300,
        isFree: subtotal >= 5000,
        zone: 'Standard',
        threshold: 5000
      };
    }
  },

  /**
   * Clear all caches
   */
  clearCache() {
    settingsCache = null;
    zonesCache = null;
  }
};