import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface StoreSettings {
  business_name: string;
  support_phone: string;
  whatsapp_business_number: string;
  delivery_fee: string;
  free_delivery_threshold: string;
  show_prices: string; // 'true' or 'false' - global price visibility
}

const defaultSettings: StoreSettings = {
  business_name: 'Karebe Wines & Spirits',
  support_phone: '',
  whatsapp_business_number: '',
  delivery_fee: '300',
  free_delivery_threshold: '5000',
  show_prices: 'true',
};

let cachedSettings: StoreSettings = { ...defaultSettings };
let settingsListeners: Array<(settings: StoreSettings) => void> = [];

/**
 * Global settings store - singleton pattern
 * Loads settings from Supabase and provides to all components
 */
export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings>(cachedSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Add listener for updates
    settingsListeners.push(setSettings);

    // Load settings if not already loaded
    if (!cachedSettings.support_phone && !cachedSettings.whatsapp_business_number) {
      loadSettings();
    } else {
      setIsLoading(false);
    }

    return () => {
      settingsListeners = settingsListeners.filter(l => l !== setSettings);
    };
  }, []);

  return { settings, isLoading };
}

/**
 * Load settings from Supabase
 */
export async function loadSettings(): Promise<StoreSettings> {
  try {
    if (!supabase) {
      console.log('[Settings] Demo mode - using default settings');
      return defaultSettings;
    }

    const result = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value');
    
    const data = result.data;
    const error = result.error;

    if (error) {
      console.log('[Settings] Error loading settings:', error.message);
      return defaultSettings;
    }

    const settingsMap: Record<string, string> = {};
    data?.forEach((row) => {
      settingsMap[row.setting_key] = row.setting_value || '';
    });

    cachedSettings = {
      business_name: settingsMap.business_name || defaultSettings.business_name,
      support_phone: settingsMap.support_phone || defaultSettings.support_phone,
      whatsapp_business_number: settingsMap.whatsapp_business_number || defaultSettings.whatsapp_business_number,
      delivery_fee: settingsMap.delivery_fee || defaultSettings.delivery_fee,
      free_delivery_threshold: settingsMap.free_delivery_threshold || defaultSettings.free_delivery_threshold,
      show_prices: settingsMap.show_prices || defaultSettings.show_prices,
    };

    // Notify all listeners
    settingsListeners.forEach(listener => listener(cachedSettings));

    console.log('[Settings] Loaded from Supabase:', cachedSettings);
    return cachedSettings;
  } catch (error) {
    console.error('[Settings] Failed to load settings:', error);
    return defaultSettings;
  }
}

/**
 * Get support phone number - used throughout the app
 */
export function getSupportPhone(): string {
  return cachedSettings.support_phone || '+254720123456';
}

/**
 * Get WhatsApp business number - used throughout the app
 */
export function getWhatsAppNumber(): string {
  return cachedSettings.whatsapp_business_number || '254720123456';
}

/**
 * Check if prices should be shown globally
 */
export function getShowPrices(): boolean {
  return cachedSettings.show_prices !== 'false';
}

/**
 * Hook to check if prices should be shown
 */
export function useShowPrices() {
  const { settings } = useSettings();
  return settings.show_prices !== 'false';
}

/**
 * Get delivery fee from settings
 */
export function getDeliveryFee(): number {
  const fee = parseInt(cachedSettings.delivery_fee || '300', 10);
  return isNaN(fee) ? 300 : fee;
}

/**
 * Get free delivery threshold from settings
 */
export function getFreeDeliveryThreshold(): number {
  const threshold = parseInt(cachedSettings.free_delivery_threshold || '5000', 10);
  return isNaN(threshold) ? 5000 : threshold;
}
