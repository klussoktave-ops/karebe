// Supabase Edge Function: checkout
// POST /functions/v1/checkout
// Validates cart, creates order (triggers handle order_items + stock deduction)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            { auth: { persistSession: false } }
        );

        const body = await req.json();
        const { userId, deliveryChannel, paymentMethod, branchId, customerPhone } = body;

        if (!deliveryChannel || !paymentMethod) {
            return Response.json(
                { ok: false, error: "MISSING_FIELDS", message: "deliveryChannel and paymentMethod are required." },
                { status: 400, headers: corsHeaders }
            );
        }

        // ── 1. Fetch cart items ──────────────────────────────────────
        const { data: cartItems, error: cartErr } = await supabase
            .from("cart_items")
            .select("*, products(id, name, variants)")
            .eq("user_id", userId);

        if (cartErr) throw cartErr;
        if (!cartItems || cartItems.length === 0) {
            return Response.json(
                { ok: false, error: "EMPTY_CART", message: "No items in cart." },
                { status: 400, headers: corsHeaders }
            );
        }

        // ── 2. Validate stock ────────────────────────────────────────
        for (const item of cartItems) {
            const variants = item.products?.variants ?? [];
            const variant = variants.find((v) => v.id === item.variant_id);
            if (!variant) {
                return Response.json(
                    { ok: false, error: "VARIANT_NOT_FOUND", message: `Variant ${item.variant_id} not found.` },
                    { status: 400, headers: corsHeaders }
                );
            }
            if (variant.stock < item.quantity) {
                return Response.json(
                    {
                        ok: false,
                        error: "STOCK_INSUFFICIENT",
                        message: `${item.products.name} (${variant.volume}) only has ${variant.stock} left. You requested ${item.quantity}.`,
                        product_id: item.product_id,
                        variant_id: item.variant_id,
                        available: variant.stock,
                    },
                    { status: 409, headers: corsHeaders }
                );
            }
        }

        // ── 3. Create order (triggers will handle order_items, stock deduction, and notifications) ──
        const { data: order, error: orderErr } = await supabase
            .from("orders")
            .insert({
                user_id: userId || null,
                customer_phone: customerPhone || null,
                total: 0, // will be updated by fn_auto_order_items trigger
                status: "pending",
                payment_method: paymentMethod,
                delivery_channel: deliveryChannel,
                branch_id: branchId || null,
                source: deliveryChannel,
            })
            .select()
            .single();

        if (orderErr) {
            // Surface stock errors from trigger
            if (orderErr.message?.includes("STOCK_INSUFFICIENT")) {
                return Response.json(
                    { ok: false, error: "STOCK_INSUFFICIENT", message: orderErr.message },
                    { status: 409, headers: corsHeaders }
                );
            }
            throw orderErr;
        }

        // ── 4. Fetch updated order (total set by trigger) ────────────
        const { data: finalOrder } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("id", order.id)
            .single();

        return Response.json(
            { ok: true, order: finalOrder },
            { status: 201, headers: corsHeaders }
        );
    } catch (err) {
        console.error("[checkout]", err);
        return Response.json(
            { ok: false, error: "INTERNAL_ERROR", message: err.message },
            { status: 500, headers: corsHeaders }
        );
    }
});
