// Supabase Edge Function: update-delivery-status
// PATCH /functions/v1/update-delivery-status
// Rider-only: advance delivery status (assigned → in_progress → completed)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_TRANSITIONS: Record<string, string> = {
    assigned: "in_progress",
    in_progress: "completed",
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

        const { assignmentId, riderId, status } = await req.json();

        if (!assignmentId || !status) {
            return Response.json(
                { ok: false, error: "MISSING_FIELDS", message: "assignmentId and status are required." },
                { status: 400, headers: corsHeaders }
            );
        }

        // ── 1. Fetch assignment ───────────────────────────────────────
        const { data: assignment, error: fetchErr } = await supabase
            .from("delivery_assignments")
            .select("id, order_id, rider_id, status")
            .eq("id", assignmentId)
            .single();

        if (fetchErr || !assignment) {
            return Response.json(
                { ok: false, error: "NOT_FOUND", message: `Assignment ${assignmentId} not found.` },
                { status: 404, headers: corsHeaders }
            );
        }

        // ── 2. Verify rider owns this assignment ──────────────────────
        if (riderId && assignment.rider_id !== riderId) {
            return Response.json(
                { ok: false, error: "FORBIDDEN", message: "You are not assigned to this delivery." },
                { status: 403, headers: corsHeaders }
            );
        }

        // ── 3. Enforce sequential status transition ───────────────────
        const expectedNext = VALID_TRANSITIONS[assignment.status];
        if (!expectedNext) {
            return Response.json(
                { ok: false, error: "ALREADY_COMPLETED", message: "This delivery is already completed or cancelled." },
                { status: 409, headers: corsHeaders }
            );
        }
        if (status !== expectedNext) {
            return Response.json(
                {
                    ok: false,
                    error: "INVALID_TRANSITION",
                    message: `Cannot go from '${assignment.status}' to '${status}'. Expected '${expectedNext}'.`,
                },
                { status: 409, headers: corsHeaders }
            );
        }

        // ── 4. Update status (trigger handles order update + notifications) ──
        const { data: updated, error: updateErr } = await supabase
            .from("delivery_assignments")
            .update({ status })
            .eq("id", assignmentId)
            .select()
            .single();

        if (updateErr) throw updateErr;

        return Response.json(
            { ok: true, assignment: updated },
            { status: 200, headers: corsHeaders }
        );
    } catch (err) {
        console.error("[update-delivery-status]", err);
        return Response.json(
            { ok: false, error: "INTERNAL_ERROR", message: err.message },
            { status: 500, headers: corsHeaders }
        );
    }
});
