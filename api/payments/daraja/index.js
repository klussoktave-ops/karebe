const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  const path = req.query.path || '';
  
  // STK Push endpoint
  if (path === 'stkpush' || path === '') {
    const { PhoneNumber, Amount, AccountReference, TransactionDesc } = req.body || {};
    
    if (!PhoneNumber || !Amount) {
      return res.status(400).json({ error: 'PhoneNumber and Amount required' });
    }

    // Simple STK push simulation - in production, integrate with Safaricom API
    return res.status(200).json({ 
      ok: true, 
      message: 'STK push initiated',
      CheckoutRequestID: 'ws_' + Date.now()
    });
  }
  
  // Callback endpoint
  if (path === 'callback') {
    const callback = req.body || {};
    // Process payment callback
    console.log('Payment callback:', callback);
    return res.status(200).json({ ok: true });
  }
  
  return res.status(404).json({ error: 'Invalid path' });
};
