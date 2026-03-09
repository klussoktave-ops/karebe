// api/admin/riders.js — Riders CRUD serverless function
// Uses service role key to bypass RLS

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
  
  // Check content-length header to handle empty responses
  const contentLength = response.headers.get('content-length');
  let data;
  
  // Handle empty response (return=minimal returns empty body)
  if (contentLength === '0' || !response.headers.get('content-type')) {
    data = null;
  } else {
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Response text:', text);
      data = null;
    }
  }

  if (!response.ok) {
    console.error('Supabase request failed:', { status: response.status, data, endpoint, method });
    throw new Error(data?.message || `HTTP ${response.status}`);
  }

  return data;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  // Get all riders
  if (method === 'GET') {
    try {
      const data = await supabaseRequest('/riders?select=*&order=full_name.asc', 'GET');
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      console.error('Error fetching riders:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // Create new rider
  if (method === 'POST') {
    try {
      const { full_name, phone, whatsapp_number, branch_id, pin } = req.body || {};

      if (!full_name || !phone) {
        return res.status(400).json({ ok: false, error: 'Full name and phone are required' });
      }

      // Generate random PIN if not provided
      const generatedPin = pin || Math.floor(1000 + Math.random() * 9000).toString();

      const data = await supabaseRequest('/riders', 'POST', {
        id: crypto.randomUUID(),
        user_id: null,
        full_name,
        phone,
        whatsapp_number: whatsapp_number || phone,
        branch_id: branch_id || null,
        pin: generatedPin,
        is_active: true,
        status: 'AVAILABLE',
      });

      return res.status(201).json({ ok: true, data: Array.isArray(data) ? data[0] : data, pin: generatedPin });
    } catch (error) {
      console.error('Error creating rider:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // Update rider
  if (method === 'PUT') {
    try {
      const { id, ...updates } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: 'Rider ID is required' });
      }

      await supabaseRequest(`/riders?id=eq.${id}`, 'PATCH', updates);

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error updating rider:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // Delete rider
  if (method === 'DELETE') {
    try {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: 'Rider ID is required' });
      }

      await supabaseRequest(`/riders?id=eq.${id}`, 'DELETE');

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error deleting rider:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};
