// api/cart.js — Cart CRUD serverless function
// GET    /api/cart?userId=     → fetch cart for user
// POST   /api/cart             → upsert item (add or increment)
// DELETE /api/cart             → remove item or clear cart

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

    // ── GET: fetch cart items ───────────────────────────────────
    if (req.method === "GET") {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

        const { data, error } = await supabase
            .from("cart_items")
            .select("*, products(id, name, category, variants, image)")
            .eq("user_id", userId);

        if (error) return res.status(500).json({ ok: false, error: error.message });

        // Enrich items with computed line total
        const enriched = (data || []).map((item) => {
            const variant = (item.products?.variants || []).find((v) => v.id === item.variant_id) || {};
            return {
                ...item,
                product_name: item.products?.name,
                volume: variant.volume,
                unit_price: variant.price || 0,
                line_total: (variant.price || 0) * item.quantity,
            };
        });

        const cart_total = enriched.reduce((s, i) => s + i.line_total, 0);
        return res.status(200).json({ ok: true, data: enriched, cart_total });
    }

    // ── POST: add / update item in cart ────────────────────────
    if (req.method === "POST") {
        const { userId, productId, variantId, quantity, branchId } = req.body;
        if (!userId || !productId || !variantId || !quantity) {
            return res.status(400).json({ ok: false, error: "userId, productId, variantId, quantity required" });
        }
        if (quantity < 1) return res.status(400).json({ ok: false, error: "quantity must be >= 1" });

        // Check stock before adding
        const { data: prod } = await supabase
            .from("products")
            .select("variants")
            .eq("id", productId)
            .single();

        const variant = (prod?.variants || []).find((v) => v.id === variantId);
        if (!variant) return res.status(404).json({ ok: false, error: "Variant not found" });
        if (variant.stock < quantity) {
            return res.status(409).json({
                ok: false,
                error: "STOCK_INSUFFICIENT",
                available: variant.stock,
            });
        }

        const { data, error } = await supabase
            .from("cart_items")
            .upsert(
                { user_id: userId, product_id: productId, variant_id: variantId, quantity, branch_id: branchId || null },
                { onConflict: "user_id,product_id,variant_id" }
            )
            .select()
            .single();

        if (error) return res.status(500).json({ ok: false, error: error.message });
        return res.status(201).json({ ok: true, data });
    }

    // ── DELETE: remove item or clear cart ──────────────────────
    if (req.method === "DELETE") {
        const { userId, itemId, clearAll } = req.body;
        if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

        let query = supabase.from("cart_items").delete().eq("user_id", userId);
        if (!clearAll && itemId) {
            query = query.eq("id", itemId);
        }

        const { error } = await query;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
};
