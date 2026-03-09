// api/admin/pricing-settings.js — Pricing Settings serverless function
// GET  /api/admin/pricing-settings         → get all settings
// GET  /api/admin/pricing-settings?key=xxx → get specific setting
// PUT  /api/admin/pricing-settings         → update settings (bulk)
// POST /api/admin/pricing-settings         → create new setting

const supabaseUrl = 'https://pwcqgwpkvesoowpnomad.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_ROLE_KEY is not configured');
}

const supabaseRestUrl = `${supabaseUrl}/rest/v1`;

async function supabaseRequest(endpoint, method, body = null) {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_ROLE_KEY is not configured');
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Prefer': method === 'POST' || method === 'PUT' ? 'return=representation' : 'return=minimal'
  };

  const options = { method, headers };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${supabaseRestUrl}${endpoint}`, options);
  
  // Handle empty response
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

// Define default settings structure
const DEFAULT_SETTINGS = {
  base_delivery_fee: { amount: 300, currency: 'KES', label: 'Base Delivery Fee' },
  free_delivery_threshold: { amount: 5000, currency: 'KES', label: 'Free Delivery Threshold' },
  vat_rate: { rate: 0.16, name: 'VAT', label: 'VAT Rate' },
  min_order_amount: { amount: 0, currency: 'KES', label: 'Minimum Order Amount' },
  max_delivery_distance: { distance: 15, unit: 'km', label: 'Max Delivery Distance' }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  // GET: fetch pricing settings
  if (method === 'GET') {
    try {
      const { key, active } = req.query;
      
      let endpoint = '/pricing_settings?select=*';
      const params = [];
      
      if (key) {
        params.push(`key=eq.${key}`);
      }
      
      if (active !== undefined) {
        params.push(`is_active=eq.${active === 'true'}`);
      }
      
      if (params.length > 0) {
        endpoint += '&' + params.join('&');
      }
      
      endpoint += '&order=key.asc';
      
      const data = await supabaseRequest(endpoint, 'GET');
      
      // Merge with defaults to ensure all settings exist
      const settingsWithDefaults = {};
      const allKeys = [...Object.keys(DEFAULT_SETTINGS), ...(data || []).map(s => s.key)];
      const uniqueKeys = [...new Set(allKeys)];
      
      for (const k of uniqueKeys) {
        const dbSetting = (data || []).find(s => s.key === k);
        const defaultSetting = DEFAULT_SETTINGS[k];
        
        if (dbSetting) {
          settingsWithDefaults[k] = {
            ...defaultSetting,
            ...dbSetting.value,
            id: dbSetting.id,
            is_active: dbSetting.is_active,
            description: dbSetting.description
          };
        } else if (defaultSetting) {
          settingsWithDefaults[k] = {
            ...defaultSetting,
            is_active: true
          };
        }
      }
      
      // If specific key requested, return just that one
      if (key) {
        return res.status(200).json({ ok: true, data: settingsWithDefaults[key] || null });
      }
      
      return res.status(200).json({ ok: true, data: settingsWithDefaults });
    } catch (error) {
      console.error('Error fetching pricing settings:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // POST: create new setting
  if (method === 'POST') {
    try {
      const { key, value, description, is_active } = req.body || {};

      if (!key || value === undefined) {
        return res.status(400).json({ ok: false, error: 'key and value are required' });
      }

      // Validate key format
      if (!/^[a-z_]+$/.test(key)) {
        return res.status(400).json({ ok: false, error: 'key must be lowercase with underscores only' });
      }

      const data = await supabaseRequest('/pricing_settings', 'POST', {
        key,
        value: JSON.stringify(value),
        description: description || null,
        is_active: is_active !== false
      });

      return res.status(201).json({ ok: true, data: Array.isArray(data) ? data[0] : data });
    } catch (error) {
      console.error('Error creating pricing setting:', error);
      if (error.message.includes('duplicate')) {
        return res.status(409).json({ ok: false, error: 'A setting with this key already exists' });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // PUT/PATCH: update settings (supports bulk update)
  if (method === 'PUT' || method === 'PATCH') {
    try {
      const { settings } = req.body || {};

      // Single update mode
      if (!Array.isArray(settings)) {
        const { key, value, description, is_active } = req.body || {};
        
        if (!key || value === undefined) {
          return res.status(400).json({ ok: false, error: 'key and value are required' });
        }

        await supabaseRequest(`/pricing_settings?key=eq.${key}`, 'PATCH', {
          value: JSON.stringify(value),
          description: description !== undefined ? description : null,
          is_active: is_active !== undefined ? is_active : true,
          updated_at: new Date().toISOString()
        });

        return res.status(200).json({ ok: true });
      }

      // Bulk update mode
      if (Array.isArray(settings)) {
        for (const setting of settings) {
          const { key, value, description, is_active } = setting;
          if (!key || value === undefined) continue;

          await supabaseRequest(`/pricing_settings?key=eq.${key}`, 'PATCH', {
            value: JSON.stringify(value),
            description: description !== undefined ? description : null,
            is_active: is_active !== undefined ? is_active : true,
            updated_at: new Date().toISOString()
          });
        }

        return res.status(200).json({ ok: true, message: `${settings.length} settings updated` });
      }

      return res.status(400).json({ ok: false, error: 'Invalid request body' });
    } catch (error) {
      console.error('Error updating pricing settings:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // DELETE: delete a setting
  if (method === 'DELETE') {
    try {
      const { key } = req.body || {};

      if (!key) {
        return res.status(400).json({ ok: false, error: 'key is required' });
      }

      await supabaseRequest(`/pricing_settings?key=eq.${key}`, 'DELETE');

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error deleting pricing setting:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};