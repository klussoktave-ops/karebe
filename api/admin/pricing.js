// api/admin/pricing.js — Combined Pricing Settings & Delivery Zones Admin API
// Handles both pricing settings and delivery zone management in one endpoint

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
  if (body) { options.body = JSON.stringify(body); }

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
  const path = req.query.path || '';
  
  // Pricing Settings endpoints
  if (path === 'settings' || path === '') {
    // GET /api/admin/pricing?path=settings
    if (method === 'GET' && (path === 'settings' || path === '')) {
      try {
        const { key } = req.query;
        let endpoint = '/pricing_settings?select=*';
        if (key) { endpoint += `&key=eq.${key}`; }
        endpoint += '&order=key.asc';
        
        const data = await supabaseRequest(endpoint, 'GET');
        const settings = {};
        for (const k of Object.keys(DEFAULT_SETTINGS)) {
          const db = (data || []).find(s => s.key === k);
          settings[k] = db ? { ...DEFAULT_SETTINGS[k], ...db.value, id: db.id, is_active: db.is_active } : { ...DEFAULT_SETTINGS[k], is_active: true };
        }
        return res.status(200).json({ ok: true, data: key ? settings[key] || null : settings });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    }

    // PUT /api/admin/pricing?path=settings
    if ((method === 'PUT' || method === 'PATCH') && path === 'settings') {
      try {
        const { settings } = req.body || {};
        if (!Array.isArray(settings)) {
          const { key, value } = req.body || {};
          if (!key || value === undefined) {
            return res.status(400).json({ ok: false, error: 'key and value required' });
          }
          await supabaseRequest(`/pricing_settings?key=eq.${key}`, 'PATCH', { value: JSON.stringify(value), updated_at: new Date().toISOString() });
          return res.status(200).json({ ok: true });
        }
        for (const s of settings) {
          if (s.key && s.value !== undefined) {
            await supabaseRequest(`/pricing_settings?key=eq.${s.key}`, 'PATCH', { value: JSON.stringify(s.value), updated_at: new Date().toISOString() });
          }
        }
        return res.status(200).json({ ok: true, message: `${settings.length} settings updated` });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    }
  }

  // Delivery Zones endpoints
  if (path === 'zones') {
    // GET /api/admin/pricing?path=zones
    if (method === 'GET') {
      try {
        const { id, active, distance } = req.query;
        let endpoint = '/delivery_zones?select=*';
        const params = [];
        if (id) params.push(`id=eq.${id}`);
        if (active !== undefined) params.push(`is_active=eq.${active === 'true'}`);
        if (params.length > 0) endpoint += '&' + params.join('&');
        endpoint += '&order=sort_order.asc,created_at.asc';
        
        const data = await supabaseRequest(endpoint, 'GET');
        return res.status(200).json({ ok: true, data: data || [] });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    }

    // POST /api/admin/pricing?path=zones
    if (method === 'POST') {
      try {
        const { name, min_distance_km, max_distance_km, fee, is_active, sort_order } = req.body || {};
        if (!name || min_distance_km === undefined || max_distance_km === undefined || fee === undefined) {
          return res.status(400).json({ ok: false, error: 'name, min_distance_km, max_distance_km, fee required' });
        }
        const data = await supabaseRequest('/delivery_zones', 'POST', { name, min_distance_km, max_distance_km, fee, is_active: is_active !== false, sort_order: sort_order || 0 });
        return res.status(201).json({ ok: true, data: Array.isArray(data) ? data[0] : data });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    }

    // PUT /api/admin/pricing?path=zones
    if (method === 'PUT' || method === 'PATCH') {
      try {
        const { id, name, min_distance_km, max_distance_km, fee, is_active, sort_order } = req.body || {};
        if (!id) { return res.status(400).json({ ok: false, error: 'id required' }); }
        
        const updateData = { updated_at: new Date().toISOString() };
        if (name !== undefined) updateData.name = name;
        if (min_distance_km !== undefined) updateData.min_distance_km = min_distance_km;
        if (max_distance_km !== undefined) updateData.max_distance_km = max_distance_km;
        if (fee !== undefined) updateData.fee = fee;
        if (is_active !== undefined) updateData.is_active = is_active;
        if (sort_order !== undefined) updateData.sort_order = sort_order;

        await supabaseRequest(`/delivery_zones?id=eq.${id}`, 'PATCH', updateData);
        const updatedData = await supabaseRequest(`/delivery_zones?id=eq.${id}`, 'GET');
        return res.status(200).json({ ok: true, data: updatedData?.[0] });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    }

    // DELETE /api/admin/pricing?path=zones
    if (method === 'DELETE') {
      try {
        const { id } = req.body || {};
        if (!id) { return res.status(400).json({ ok: false, error: 'id required' }); }
        
        // Check for orders using this zone
        const check = await supabaseRequest(`/orders?delivery_zone_id=eq.${id}&select=id&limit=1`, 'GET');
        if (check && check.length > 0) {
          await supabaseRequest(`/delivery_zones?id=eq.${id}`, 'PATCH', { is_active: false, updated_at: new Date().toISOString() });
          return res.status(200).json({ ok: true, message: 'Zone deactivated (has orders)', deactivated: true });
        }
        
        await supabaseRequest(`/delivery_zones?id=eq.${id}`, 'DELETE');
        return res.status(200).json({ ok: true });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  return res.status(405).json({ ok: false, error: 'Invalid path or method. Use ?path=settings or ?path=zones' });
};
