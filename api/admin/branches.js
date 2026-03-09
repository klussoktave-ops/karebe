// api/admin/branches.js — Branches CRUD serverless function
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
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
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

  // Get all branches
  if (method === 'GET') {
    try {
      const data = await supabaseRequest('/branches?select=*&order=created_at.desc', 'GET');
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      console.error('Error fetching branches:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // Create new branch
  if (method === 'POST') {
    try {
      const { name, address, phone, is_main, mpesa_shortcode, mpesa_payment_type } = req.body || {};

      if (!name) {
        return res.status(400).json({ ok: false, error: 'Name is required' });
      }

      const data = await supabaseRequest('/branches', 'POST', {
        name,
        address: address || null,
        phone: phone || null,
        is_main: is_main || false,
        mpesa_shortcode: mpesa_shortcode || null,
        mpesa_payment_type: mpesa_payment_type || null,
      });

      return res.status(201).json({ ok: true, data: Array.isArray(data) ? data[0] : data });
    } catch (error) {
      console.error('Error creating branch:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // Update branch
  if (method === 'PUT') {
    try {
      const { id, ...updates } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: 'Branch ID is required' });
      }

      await supabaseRequest(`/branches?id=eq.${id}`, 'PATCH', updates);

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error updating branch:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  // Delete branch
  if (method === 'DELETE') {
    try {
      const { id } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, error: 'Branch ID is required' });
      }

      await supabaseRequest(`/branches?id=eq.${id}`, 'DELETE');

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error deleting branch:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};
