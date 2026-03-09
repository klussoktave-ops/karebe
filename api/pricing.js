// api/pricing.js — Public Pricing API serverless function
// GET /api/pricing              → get all pricing settings
// GET /api/pricing?distance=5   → get delivery fee for distance

const supabaseUrl = 'https://pwcqgwpkvesoowpnomad.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabaseRestUrl = `${supabaseUrl}/rest/v1`;

async function supabaseRequest(endpoint, method, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseAnonKey || '',
    'Authorization': `Bearer ${supabaseAnonKey || ''}`
  };

  const options = { method, headers };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${supabaseRestUrl}${endpoint}`, options);
  
  const contentLength = response.headers.get('content-length');
  let data;
  if (contentLength === '0' || !response.headers.get('content-type')) {
    data = null;
  } else {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  }

  if (!response.ok) {
    console.error('Supabase request failed:', { status: response.status, data, endpoint, method });
    throw new Error(data?.message || `HTTP ${response.status}`);
  }

  return data;
}

// Default values if database is not configured
const DEFAULT_SETTINGS = {
  base_delivery_fee: { amount: 300, currency: 'KES' },
  free_delivery_threshold: { amount: 5000, currency: 'KES' },
  vat_rate: { rate: 0.16 },
  min_order_amount: { amount: 0, currency: 'KES' },
  max_delivery_distance: { distance: 15, unit: 'km' }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { distance, subtotal } = req.query;

    // If querying by specific distance
    if (distance !== undefined) {
      const distanceNum = parseFloat(distance);
      const subtotalNum = subtotal ? parseFloat(subtotal) : 0;

      if (isNaN(distanceNum)) {
        return res.status(400).json({ ok: false, error: 'Invalid distance value' });
      }

      // Get pricing settings
      let settings = { ...DEFAULT_SETTINGS };
      try {
        const settingsData = await supabaseRequest(
          '/pricing_settings?is_active=eq.true&select=key,value',
          'GET'
        );
        if (settingsData) {
          for (const s of settingsData) {
            if (s.value && typeof s.value === 'string') {
              settings[s.key] = JSON.parse(s.value);
            } else {
              settings[s.key] = s.value;
            }
          }
        }
      } catch (e) {
        console.log('Using default pricing settings');
      }

      // Get zone for distance
      let zone = null;
      try {
        const zonesData = await supabaseRequest(
          `/delivery_zones?is_active=eq.true&min_distance_km=lte.${distanceNum}&max_distance_km=gt.${distanceNum}&select=*&limit=1`,
          'GET'
        );
        if (zonesData && zonesData.length > 0) {
          zone = zonesData[0];
        }
      } catch (e) {
        console.log('No zone found for distance');
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
        const vatRate = settings.vat_rate?.rate || 0.16;
        vatAmount = Math.round(subtotalNum * vatRate);
      }

      const totalAmount = subtotalNum + deliveryFee + vatAmount;

      return res.status(200).json({
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
          settings: settings
        }
      });
    }

    // Return all pricing settings
    let settings = { ...DEFAULT_SETTINGS };
    let zones = [];

    try {
      // Get settings
      const settingsData = await supabaseRequest(
        '/pricing_settings?is_active=eq.true&select=key,value',
        'GET'
      );
      if (settingsData) {
        for (const s of settingsData) {
          if (s.value && typeof s.value === 'string') {
            settings[s.key] = JSON.parse(s.value);
          } else {
            settings[s.key] = s.value;
          }
        }
      }

      // Get active zones
      const zonesData = await supabaseRequest(
        '/delivery_zones?is_active=eq.true&select=*&order=sort_order.asc',
        'GET'
      );
      if (zonesData) {
        zones = zonesData;
      }
    } catch (e) {
      console.log('Using default pricing configuration');
      // Return default zones
      zones = [
        { id: 'default-a', name: 'Zone A - Very Close', min_distance_km: 0, max_distance_km: 2, fee: 150 },
        { id: 'default-b', name: 'Zone B - Close', min_distance_km: 2, max_distance_km: 5, fee: 300 },
        { id: 'default-c', name: 'Zone C - Medium', min_distance_km: 5, max_distance_km: 10, fee: 500 },
        { id: 'default-d', name: 'Zone D - Far', min_distance_km: 10, max_distance_km: 15, fee: 800 }
      ];
    }

    return res.status(200).json({
      ok: true,
      data: {
        settings,
        zones,
        currency: 'KES'
      }
    });

  } catch (error) {
    console.error('Error fetching pricing:', error);
    
    // Return defaults on error
    return res.status(200).json({
      ok: true,
      data: {
        settings: DEFAULT_SETTINGS,
        zones: [
          { id: 'default-a', name: 'Zone A - Very Close', min_distance_km: 0, max_distance_km: 2, fee: 150 },
          { id: 'default-b', name: 'Zone B - Close', min_distance_km: 2, max_distance_km: 5, fee: 300 },
          { id: 'default-c', name: 'Zone C - Medium', min_distance_km: 5, max_distance_km: 10, fee: 500 },
          { id: 'default-d', name: 'Zone D - Far', min_distance_km: 10, max_distance_km: 15, fee: 800 }
        ],
        currency: 'KES',
        _fallback: true
      }
    });
  }
};