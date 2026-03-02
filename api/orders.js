// api/orders.js — Orders serverless function
// GET  /api/orders?userId=          → customer order history
// GET  /api/orders?adminBranchId=   → admin branch orders (most recent first)
// POST /api/orders                  → create order (delegates to checkout Edge Function)

const { createClient } = require("@supabase/supabase-js");

function supabaseAdmin() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
    );
}

module.exports = async function handler(req, res) {
    const supabase = supabaseAdmin();

    // ── GET ────────────────────────────────────────────────────
    if (req.method === "GET") {
        const { userId, adminBranchId, limit = 50 } = req.query;

        let query = supabase
            .from("orders")
            .select("*, order_items(*)")
            .order("created_at", { ascending: false })
            .limit(Number(limit));

        if (userId) {
            query = query.eq("user_id", userId);
        } else if (adminBranchId) {
            query = query.eq("branch_id", adminBranchId);
        } else {
            return res.status(400).json({ ok: false, error: "Provide userId or adminBranchId" });
        }

        const { data, error } = await query;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        return res.status(200).json({ ok: true, data });
    }

    // ── POST: proxy to checkout Edge Function ──────────────────
    if (req.method === "POST") {
        const edgeFnUrl = `${process.env.SUPABASE_URL}/functions/v1/checkout`;

        try {
            const efRes = await fetch(edgeFnUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify(req.body),
            });
            const json = await efRes.json();
            return res.status(efRes.status).json(json);
        } catch (err) {
            return res.status(500).json({ ok: false, error: err.message });
        }
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
};
