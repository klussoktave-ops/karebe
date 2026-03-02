// api/delivery.js — Delivery assignment serverless function
// GET   /api/delivery?riderId=       → rider's assigned deliveries
// GET   /api/delivery?adminBranchId= → admin branch deliveries (all statuses)
// POST  /api/delivery                → assign rider (admin; delegates to assign-delivery Edge Fn)
// PATCH /api/delivery                → update status (rider; delegates to update-delivery-status Edge Fn)

const { createClient } = require("@supabase/supabase-js");

function supabaseAdmin() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
    );
}

async function callEdgeFn(path, method, body, env) {
    const url = `${env.SUPABASE_URL}/functions/v1/${path}`;
    const res = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json() };
}

module.exports = async function handler(req, res) {
    const supabase = supabaseAdmin();
    const env = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };

    // ── GET ────────────────────────────────────────────────────
    if (req.method === "GET") {
        const { riderId, adminBranchId } = req.query;

        if (riderId) {
            const { data, error } = await supabase
                .from("delivery_assignments")
                .select("*, orders(id, total, status, customer_phone, branch_id, delivery_channel, order_items(*))")
                .eq("rider_id", riderId)
                .order("created_at", { ascending: false });

            if (error) return res.status(500).json({ ok: false, error: error.message });
            return res.status(200).json({ ok: true, data });
        }

        if (adminBranchId) {
            const { data, error } = await supabase
                .from("delivery_assignments")
                .select("*, orders!inner(id, total, status, customer_phone, branch_id, delivery_channel, order_items(*))")
                .eq("orders.branch_id", adminBranchId)
                .order("created_at", { ascending: false });

            if (error) return res.status(500).json({ ok: false, error: error.message });
            return res.status(200).json({ ok: true, data });
        }

        return res.status(400).json({ ok: false, error: "Provide riderId or adminBranchId" });
    }

    // ── POST: assign rider ─────────────────────────────────────
    if (req.method === "POST") {
        const { status, json } = await callEdgeFn("assign-delivery", "POST", req.body, env);
        return res.status(status).json(json);
    }

    // ── PATCH: update delivery status ──────────────────────────
    if (req.method === "PATCH") {
        const { status, json } = await callEdgeFn("update-delivery-status", "PATCH", req.body, env);
        return res.status(status).json(json);
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
};
