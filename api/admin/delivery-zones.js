// api/admin/delivery-zones.js — Delivery Zones serverless function
// GET    /api/admin/delivery-zones           → list all zones
// GET    /api/admin/delivery-zones?active=true → list active zones only
// GET    /api/admin/delivery-zones?distance=5 → get zone for specific distance
// POST   /api/admin/delivery-zones           → create zone
// PUT    /api/admin/delivery-zones           → update zone
// DELETE /api/admin/delivery-zones           → delete zone

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  // GET: fetch delivery zones
  if (method === 'GET') {
    try {
      const { active, distance, branch_id, id } = req.query;
      
      // If querying by specific distance, use the database function
      if (distance) {
        const distanceNum = parseFloat(distance);
        if (isNaN(distanceNum)) {
          return res.status(400).json({ ok: false, error: 'Invalid distance value' });
        }

        // Call the database function
        const funcUrl = `${supabaseUrl}/rest/v1/rpc/get_delivery_fee_by_distance`;
        const funcResponse = await fetch(funcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ p_distance_km: distanceNum })
        });

        const funcData = await funcResponse.json();
        
        if (funcResponse.ok && funcData && funcData.length > 0) {
          return res.status(200).json({ 
            ok: true, 
            data: funcData[0],
            distance: distanceNum
          });
        }

        // If no zone found, return not found
        return res.status(200).json({ 
          ok: true, 
          data: null,
          distance: distanceNum,
          message: 'No delivery zone found for this distance'
        });
      }

      // Standard list query
      let endpoint = '/delivery_zones?select=*';
      const params = [];
      
      if (id) {
        params.push(`id=eq.${id}`);
      }
      
      if (branch_id) {
        params.push(`branch_id=eq.${branch_id}`);
      }
      
      if (active !== undefined) {
        params.push(`is_active=eq.${active === 'true'}`);
      }
      
      if (params.length > 0) {
        endpoint += '&' + params.join('&');
      }
      
      endpoint += '&order=sort_order.asc,created_at.asc';
      
      const data = await supabaseRequest(endpoint, 'GET');
      
      return res.status(200).json({ ok: true, data: data || [] });
    } catch (error) {
      console.error('Error fetching delivery zones:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // POST: create new zone
  if (method === 'POST') {
    try {
      const { name, branch_id, min_distance_km, max_distance_km, fee, is_active, sort_order } = req.body || {};

      if (!name || min_distance_km === undefined || max_distance_km === undefined || fee === undefined) {
        return res.status(400).json({ 
          ok: false, 
          error: 'name, min_distance_km, max_distance_km, and fee are required' 
        });
      }

      // Validate distance ranges
      if (min_distance_km < 0) {
        return res.status(400).json({ ok: false, error: 'min_distance_km must be >= 0' });
      }
      
      if (max_distance_km <= min_distance_km) {
        return res.status(400).json({ ok: false, error: 'max_distance_km must be greater than min_distance_km' });
      }

      if (fee < 0) {
        return res.status(400).json({ ok: false, error: 'fee must be >= 0' });
      }

      const data = await supabaseRequest('/delivery_zones', 'POST', {
        name,
        branch_id: branch_id || null,
        min_distance_km,
        max_distance_km,
        fee,
        is_active: is_active !== false,
        sort_order: sort_order || 0
      });

      return res.status(201).json({ ok: true, data: Array.isArray(data) ? data[0] : data });
    } catch (error) {
      console.error('Error creating delivery zone:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // PUT/PATCH: update zone
  if (method === 'PUT' || method === 'PATCH') {
    try {
      const { id, name, branch_id, min_distance_km, max_distance_km, fee, is_active, sort_order } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: 'id is required' });
      }

      // Validate distance ranges if provided
      if (min_distance_km !== undefined && min_distance_km < 0) {
        return res.status(400).json({ ok: false, error: 'min_distance_km must be >= 0' });
      }
      
      if (max_distance_km !== undefined && min_distance_km !== undefined && max_distance_km <= min_distance_km) {
        return res.status(400).json({ ok: false, error: 'max_distance_km must be greater than min_distance_km' });
      }

      if (fee !== undefined && fee < 0) {
        return res.status(400).json({ ok: false, error: 'fee must be >= 0' });
      }

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (name !== undefined) updateData.name = name;
      if (branch_id !== undefined) updateData.branch_id = branch_id;
      if (min_distance_km !== undefined) updateData.min_distance_km = min_distance_km;
      if (max_distance_km !== undefined) updateData.max_distance_km = max_distance_km;
      if (fee !== undefined) updateData.fee = fee;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (sort_order !== undefined) updateData.sort_order = sort_order;

      await supabaseRequest(`/delivery_zones?id=eq.${id}`, 'PATCH', updateData);

      // Return updated zone
      const updatedData = await supabaseRequest(`/delivery_zones?id=eq.${id}`, 'GET');

      return res.status(200).json({ ok: true, data: updatedData?.[0] });
    } catch (error) {
      console.error('Error updating delivery zone:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // DELETE: delete zone
  if (method === 'DELETE') {
    try {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: 'id is required' });
      }

      // Check if zone is being used by any orders
      const checkEndpoint = `/orders?delivery_zone_id=eq.${id}&select=id&limit=1`;
      const ordersUsingZone = await supabaseRequest(checkEndpoint, 'GET');
      
      if (ordersUsingZone && ordersUsingZone.length > 0) {
        // Instead of deleting, just deactivate
        await supabaseRequest(`/delivery_zones?id=eq.${id}`, 'PATCH', {
          is_active: false,
          updated_at: new Date().toISOString()
        });
        return res.status(200).json({ 
          ok: true, 
          message: 'Zone deactivated (has associated orders)',
          deactivated: true 
        });
      }

      await supabaseRequest(`/delivery_zones?id=eq.${id}`, 'DELETE');

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error deleting delivery zone:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};