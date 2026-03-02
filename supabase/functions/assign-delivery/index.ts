// Supabase Edge Function: assign-delivery
// POST /functions/v1/assign-delivery
// Admin-only: assign a rider to an order

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

        const { orderId, riderId, notes } = await req.json();

        if (!orderId || !riderId) {
            return Response.json(
                { ok: false, error: "MISSING_FIELDS", message: "orderId and riderId are required." },
                { status: 400, headers: corsHeaders }
            );
        }

        // ── 1. Check the order exists ─────────────────────────────────
        const { data: order, error: orderErr } = await supabase
            .from("orders")
            .select("id, status, branch_id")
            .eq("id", orderId)
            .single();

        if (orderErr || !order) {
            return Response.json(
                { ok: false, error: "ORDER_NOT_FOUND", message: `Order ${orderId} not found.` },
                { status: 404, headers: corsHeaders }
            );
        }

        // ── 2. Enforce one assignment per order (upsert with conflict) ──
        const { data: assignment, error: assignErr } = await supabase
            .from("delivery_assignments")
            .upsert(
                { order_id: orderId, rider_id: riderId, status: "assigned", notes: notes || null },
                { onConflict: "order_id", ignoreDuplicates: false }
            )
            .select()
            .single();

        if (assignErr) throw assignErr;

        // ── 3. Update order status to 'confirmed' ────────────────────
        await supabase
            .from("orders")
            .update({ status: "confirmed" })
            .eq("id", orderId);

        return Response.json(
            { ok: true, assignment },
            { status: 201, headers: corsHeaders }
        );
    } catch (err) {
        console.error("[assign-delivery]", err);
        return Response.json(
            { ok: false, error: "INTERNAL_ERROR", message: err.message },
            { status: 500, headers: corsHeaders }
        );
    }
});
