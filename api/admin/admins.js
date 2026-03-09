// Use native fetch (available in Vercel Node.js 18+)

// Hardcoded Supabase URL - environment variable not available in Vercel serverless
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

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${supabaseRestUrl}${endpoint}`, options);
  
  // Handle empty response (return=minimal returns empty body)
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
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  // Get all admin users
  if (method === 'GET') {
    try {
      const data = await supabaseRequest('/admin_users?select=*&order=created_at.desc', 'GET');
      const safeData = (data || []).map(admin => ({
        ...admin,
        password_hash: undefined
      }));
      return res.status(200).json({ ok: true, data: safeData });
    } catch (error) {
      console.error('Error fetching admins:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // Create new admin user
  if (method === 'POST') {
    try {
      const { email, password, name, phone, role, branch_id, is_active } = req.body || {};

      if (!email || !password || !name) {
        return res.status(400).json({ ok: false, error: 'Email, password, and name are required' });
      }

      const data = await supabaseRequest('/admin_users', 'POST', {
        email,
        password_hash: password,
        name,
        phone: phone || null,
        role: role || 'admin',
        branch_id: branch_id || null,
        is_active: is_active !== false,
      });

      const safeData = {
        ...(Array.isArray(data) ? data[0] : data),
        password_hash: undefined
      };

      return res.status(201).json({ ok: true, data: safeData });
    } catch (error) {
      console.error('Error creating admin:', error);
      if (error.message.includes('duplicate')) {
        return res.status(409).json({ ok: false, error: 'An admin with this email already exists' });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // Update admin user
  if (method === 'PUT') {
    try {
      const { id, ...updates } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: 'Admin ID is required' });
      }

      // Remove password_hash from updates if not provided
      delete updates.password_hash;

      await supabaseRequest(`/admin_users?id=eq.${id}`, 'PATCH', updates);

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error updating admin:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // Delete admin user
  if (method === 'DELETE') {
    try {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: 'Admin ID is required' });
      }

      await supabaseRequest(`/admin_users?id=eq.${id}`, 'DELETE');

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error deleting admin:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};