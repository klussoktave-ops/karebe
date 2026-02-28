module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = req.body || {};
  const amount = Number(body.amount || 0);
  if (!amount || amount <= 0) {
    return res.status(400).json({ ok: false, error: "Amount must be greater than zero" });
  }

  return res.status(200).json({
    ok: true,
    provider: "safaricom-daraja",
    environment: "sandbox",
    merchantRequestId: `mreq_${Math.random().toString(36).slice(2, 10)}`,
    checkoutRequestId: `creq_${Math.random().toString(36).slice(2, 10)}`,
    customerMessage: "STK push request accepted (mock)."
  });
};
