// =============================================================================
// Pricing API Routes
// Handles pricing settings, delivery zones, and public pricing calculation
// =============================================================================

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

// Default settings - must be configured in admin (no hardcoded prices)
const DEFAULT_SETTINGS = {
  base_delivery_fee: { amount: 0, currency: 'KES', label: 'Base Delivery Fee' },
  free_delivery_threshold: { amount: 0, currency: 'KES', label: 'Free Delivery Threshold' },
  vat_rate: { rate: 0, name: 'VAT', label: 'VAT Rate' },
  min_order_amount: { amount: 0, currency: 'KES', label: 'Minimum Order Amount' },
  max_delivery_distance: { distance: 0, unit: 'km', label: 'Max Delivery Distance' }
};

// Public defaults
const PUBLIC_DEFAULT_SETTINGS = {
  base_delivery_fee: { amount: 0, currency: 'KES' },
  free_delivery_threshold: { amount: 0, currency: 'KES' },
  vat_rate: { rate: 0 },
  min_order_amount: { amount: 0, currency: 'KES' },
  max_delivery_distance: { distance: 0, unit: 'km' }
};

const DEFAULT_ZONES = [
  { id: 'default-a', name: 'Zone A - Very Close', min_distance_km: 0, max_distance_km: 2, fee: 150 },
  { id: 'default-b', name: 'Zone B - Close', min_distance_km: 2, max_distance_km: 5, fee: 300 },
  { id: 'default-c', name: 'Zone C - Medium', min_distance_km: 5, max_distance_km: 10, fee: 500 },
  { id: 'default-d', name: 'Zone D - Far', min_distance_km: 10, max_distance_km: 15, fee: 800 }
];

// =============================================================================
// Pricing Settings Endpoints
// =============================================================================

/**
 * GET /api/pricing/settings
 * Get all pricing settings or a specific setting
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const { key } = req.query;
    
    let query = supabase
      .from('pricing_settings')
      .select('*')
      .order('key', { ascending: true });
    
    if (key) {
      query = query.eq('key', key as string);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const settings: Record<string, unknown> = {};
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      const db = (data || []).find((s: { key: string }) => s.key === k);
      if (db) {
        const value = typeof db.value === 'string' ? JSON.parse(db.value) : db.value;
        settings[k] = { ...DEFAULT_SETTINGS[k as keyof typeof DEFAULT_SETTINGS], ...value, id: db.id, is_active: db.is_active };
      } else {
        settings[k] = { ...DEFAULT_SETTINGS[k as keyof typeof DEFAULT_SETTINGS], is_active: true };
      }
    }
    
    res.json({
      ok: true,
      data: key ? settings[key as string] || null : settings
    });
  } catch (error) {
    logger.error('Error fetching pricing settings', { error });
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

/**
 * PUT /api/pricing/settings
 * Update pricing settings (single or bulk)
 */
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body || {};
    
    if (!Array.isArray(settings)) {
      // Single setting update
      const { key, value } = req.body || {};
      if (!key || value === undefined) {
        return res.status(400).json({ ok: false, error: 'key and value required' });
      }
      
      const { error } = await supabase
        .from('pricing_settings')
        .update({ value: JSON.stringify(value), updated_at: new Date().toISOString() })
        .eq('key', key);
      
      if (error) throw error;
      return res.json({ ok: true });
    }
    
    // Bulk update
    for (const s of settings) {
      if (s.key && s.value !== undefined) {
        const { error } = await supabase
          .from('pricing_settings')
          .update({ value: JSON.stringify(s.value), updated_at: new Date().toISOString() })
          .eq('key', s.key);
        
        if (error) throw error;
      }
    }
    
    return res.json({ ok: true, message: `${settings.length} settings updated` });
  } catch (error) {
    logger.error('Error updating pricing settings', { error });
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

// =============================================================================
// Delivery Zones Endpoints
// =============================================================================

/**
 * GET /api/pricing/zones
 * Get all delivery zones
 */
router.get('/zones', async (req: Request, res: Response) => {
  try {
    const { id, active } = req.query;
    
    let query = supabase
      .from('delivery_zones')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (id) {
      query = query.eq('id', id as string);
    }
    if (active !== undefined) {
      query = query.eq('is_active', active === 'true');
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ ok: true, data: data || [] });
  } catch (error) {
    logger.error('Error fetching delivery zones', { error });
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

/**
 * POST /api/pricing/zones
 * Create a new delivery zone
 */
router.post('/zones', async (req: Request, res: Response) => {
  try {
    const { name, min_distance_km, max_distance_km, fee, is_active, sort_order } = req.body || {};
    
    if (!name || min_distance_km === undefined || max_distance_km === undefined || fee === undefined) {
      return res.status(400).json({ 
        ok: false, 
        error: 'name, min_distance_km, max_distance_km, fee required' 
      });
    }
    
    const { data, error } = await supabase
      .from('delivery_zones')
      .insert({ 
        name, 
        min_distance_km, 
        max_distance_km, 
        fee, 
        is_active: is_active !== false, 
        sort_order: sort_order || 0 
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({ ok: true, data });
  } catch (error) {
    logger.error('Error creating delivery zone', { error });
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

/**
 * PUT /api/pricing/zones
 * Update a delivery zone
 */
router.put('/zones', async (req: Request, res: Response) => {
  try {
    const { id, name, min_distance_km, max_distance_km, fee, is_active, sort_order } = req.body || {};
    
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id required' });
    }
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    
    if (name !== undefined) updateData.name = name;
    if (min_distance_km !== undefined) updateData.min_distance_km = min_distance_km;
    if (max_distance_km !== undefined) updateData.max_distance_km = max_distance_km;
    if (fee !== undefined) updateData.fee = fee;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    
    const { data, error } = await supabase
      .from('delivery_zones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ ok: true, data });
  } catch (error) {
    logger.error('Error updating delivery zone', { error });
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

/**
 * DELETE /api/pricing/zones
 * Delete (or deactivate) a delivery zone
 */
router.delete('/zones', async (req: Request, res: Response) => {
  try {
    const { id } = req.body || {};
    
    if (!id) {
      return res.status(400).json({ ok: false, error: 'id required' });
    }
    
    // Check for orders using this zone
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('delivery_zone_id', id)
      .limit(1);
    
    if (existingOrders && existingOrders.length > 0) {
      // Deactivate instead of delete
      await supabase
        .from('delivery_zones')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      return res.json({ ok: true, message: 'Zone deactivated (has orders)', deactivated: true });
    }
    
    const { error } = await supabase
      .from('delivery_zones')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ ok: true });
  } catch (error) {
    logger.error('Error deleting delivery zone', { error });
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

// =============================================================================
// Public Pricing Endpoints (no auth required)
// =============================================================================

/**
 * GET /api/pricing/calculate
 * Calculate delivery fee for a given distance (public endpoint)
 */
router.get('/calculate', async (req: Request, res: Response) => {
  try {
    const { distance, subtotal } = req.query;
    const distanceNum = parseFloat(distance as string || '0');
    const subtotalNum = subtotal ? parseFloat(subtotal as string) : 0;

    if (isNaN(distanceNum)) {
      return res.status(400).json({ ok: false, error: 'Invalid distance value' });
    }

    // Get pricing settings
    let settings = { ...PUBLIC_DEFAULT_SETTINGS };
    try {
      const { data: settingsData } = await supabase
        .from('pricing_settings')
        .select('key, value')
        .eq('is_active', true);

      if (settingsData) {
        for (const s of settingsData) {
          const value = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          settings[s.key as keyof typeof settings] = value;
        }
      }
    } catch (e) {
      logger.warn('Using default pricing settings', { error: e });
    }

    // Get zone for distance
    let zone = null;
    try {
      const { data: zonesData } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .lte('min_distance_km', distanceNum)
        .gt('max_distance_km', distanceNum)
        .limit(1);

      if (zonesData && zonesData.length > 0) {
        zone = zonesData[0];
      }
    } catch (e) {
      logger.warn('No zone found for distance', { distance: distanceNum, error: e });
    }

    // Calculate delivery fee
    let deliveryFee = settings.base_delivery_fee?.amount || 300;
    let isFreeDelivery = false;
    let zoneName = 'Standard Delivery';

    if (zone) {
      deliveryFee = zone.fee;
      zoneName = zone.name;
    }

    // Check free delivery threshold
    const freeThreshold = settings.free_delivery_threshold?.amount || 5000;
    if (subtotalNum >= freeThreshold) {
      deliveryFee = 0;
      isFreeDelivery = true;
    }

    // Calculate VAT if subtotal provided
    let vatAmount = 0;
    if (subtotalNum > 0) {
      const vatRate = settings.vat_rate?.rate || 0;
      vatAmount = Math.round(subtotalNum * vatRate);
    }

    const totalAmount = subtotalNum + deliveryFee + vatAmount;

    res.json({
      ok: true,
      data: {
        distance: distanceNum,
        zone: zoneName,
        delivery_fee: deliveryFee,
        is_free_delivery: isFreeDelivery,
        free_delivery_threshold: freeThreshold,
        vat_amount: vatAmount,
        subtotal: subtotalNum,
        total: totalAmount,
        settings
      }
    });
  } catch (error) {
    logger.error('Error calculating pricing', { error });
    res.json({
      ok: true,
      data: {
        settings: PUBLIC_DEFAULT_SETTINGS,
        zones: DEFAULT_ZONES,
        currency: 'KES',
        _fallback: true
      }
    });
  }
});

/**
 * GET /api/pricing
 * Get all pricing settings and zones (public endpoint)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    let settings = { ...PUBLIC_DEFAULT_SETTINGS };
    let zones = [...DEFAULT_ZONES];

    // Get settings
    const { data: settingsData } = await supabase
      .from('pricing_settings')
      .select('key, value')
      .eq('is_active', true);

    if (settingsData) {
      for (const s of settingsData) {
        const value = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
        settings[s.key as keyof typeof settings] = value;
      }
    }

    // Get active zones
    const { data: zonesData } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (zonesData) {
      zones = zonesData;
    }

    res.json({
      ok: true,
      data: {
        settings,
        zones,
        currency: 'KES',
        // Frontend-friendly format
        vatRate: settings.vat_rate?.rate || 0,
        freeDeliveryThreshold: settings.free_delivery_threshold?.amount || 0,
        baseDeliveryFee: settings.base_delivery_fee?.amount || 0,
        minOrderAmount: settings.min_order_amount?.amount || 0,
        maxDeliveryDistance: settings.max_delivery_distance?.distance || 15
      }
    });
  } catch (error) {
    logger.error('Error fetching pricing', { error });
    res.json({
      ok: true,
      data: {
        settings: PUBLIC_DEFAULT_SETTINGS,
        zones: DEFAULT_ZONES,
        currency: 'KES',
        _fallback: true
      }
    });
  }
});

export default router;