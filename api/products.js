// api/products.js — Products CRUD serverless function
// GET    /api/products                  → list all products (public)
// GET    /api/products?id=              → single product
// POST   /api/products                  → admin: create product
// PATCH  /api/products                  → admin: update product / stock
// DELETE /api/products?id=&adminUser=   → admin: archive product (sets stock to 0 in all variants)

const { createClient } = require("@supabase/supabase-js");

function supabaseAdmin() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
    );
}

function requireAdminSession(req) {
    // Check for admin session header (set by app.js from sessionStorage)
    const adminUser = req.headers["x-karebe-admin-user"] || req.body?.adminUser;
    return !!adminUser;
}

module.exports = async function handler(req, res) {
    const supabase = supabaseAdmin();

    // ── GET: list or single ────────────────────────────────────
    if (req.method === "GET") {
        const { id, category, limit = 100 } = req.query;

        let query = supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(Number(limit));

        if (id) query = query.eq("id", id);
        if (category) query = query.eq("category", category);

        const { data, error } = id ? await query.single() : await query;
        if (error) return res.status(id ? 404 : 500).json({ ok: false, error: error.message });
        return res.status(200).json({ ok: true, data });
    }

    // ── POST: create product ───────────────────────────────────
    if (req.method === "POST") {
        if (!requireAdminSession(req)) {
            return res.status(403).json({ ok: false, error: "Admin access required" });
        }

        const { name, description, category, image, variants, popular, newArrival, branchId } = req.body;
        if (!name || !category || !variants || !Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({ ok: false, error: "name, category, and at least one variant are required" });
        }

        // Validate variants
        for (const v of variants) {
            if (!v.id || !v.volume || v.price == null || v.stock == null) {
                return res.status(400).json({
                    ok: false,
                    error: "Each variant must have id, volume, price, and stock",
                    invalid_variant: v,
                });
            }
        }

        const { data, error } = await supabase
            .from("products")
            .insert({
                name,
                description: description || null,
                category,
                image: image || null,
                variants,
                popular: popular || false,
                new_arrival: newArrival || false,
                branch_id: branchId || null,
            })
            .select()
            .single();

        if (error) return res.status(500).json({ ok: false, error: error.message });
        return res.status(201).json({ ok: true, data });
    }

    // ── PATCH: update product ──────────────────────────────────
    if (req.method === "PATCH") {
        if (!requireAdminSession(req)) {
            return res.status(403).json({ ok: false, error: "Admin access required" });
        }

        const { id, ...updates } = req.body;
        if (!id) return res.status(400).json({ ok: false, error: "id required" });

        // Strip fields not allowed in updates
        const allowed = ["name", "description", "category", "image", "variants", "popular", "new_arrival", "branch_id"];
        const safeUpdates = {};
        for (const key of allowed) {
            if (updates[key] !== undefined) safeUpdates[key] = updates[key];
        }
        if (updates.newArrival !== undefined) safeUpdates.new_arrival = updates.newArrival;

        const { data, error } = await supabase
            .from("products")
            .update(safeUpdates)
            .eq("id", id)
            .select()
            .single();

        if (error) return res.status(500).json({ ok: false, error: error.message });
        return res.status(200).json({ ok: true, data });
    }

    // ── DELETE: archive (zero-stock) ───────────────────────────
    if (req.method === "DELETE") {
        if (!requireAdminSession(req)) {
            return res.status(403).json({ ok: false, error: "Admin access required" });
        }

        const { id } = req.query;
        if (!id) return res.status(400).json({ ok: false, error: "id required" });

        // Fetch current variants, zero out stock
        const { data: prod } = await supabase.from("products").select("variants").eq("id", id).single();
        const zeroed = (prod?.variants || []).map((v) => ({ ...v, stock: 0 }));

        const { error } = await supabase
            .from("products")
            .update({ variants: zeroed })
            .eq("id", id);

        if (error) return res.status(500).json({ ok: false, error: error.message });
        return res.status(200).json({ ok: true, message: "Product archived (stock zeroed)" });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
};
