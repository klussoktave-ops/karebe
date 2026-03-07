// api/riders.js — Rider serverless function
// GET  /api/riders/:id/orders      → get orders assigned to rider (from delivery_assignments)
// POST /api/riders/:id/orders/:orderId/confirm → confirm rider assignment
// POST /api/riders/:id/orders/:orderId/start   → start delivery
// POST /api/riders/:id/orders/:orderId/complete → complete delivery

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
    const urlParts = req.url.split('/').filter(Boolean);
    
    if (urlParts.length < 2 || urlParts[0] !== 'riders') {
        return res.status(404).json({ ok: false, error: "Not found" });
    }

    const riderId = urlParts[1];
    const ordersIndex = urlParts.indexOf('orders');
    
    // GET /api/riders/:id/orders - fetch from delivery_assignments OR orders table
    if (req.method === "GET" && ordersIndex === 2 && urlParts.length === 3) {
        const { status } = req.query;
        
        console.log('[RiderAPI] Fetching orders for rider:', riderId, 'status:', status);
        
        // First try delivery_assignments table
        let daQuery = supabase
            .from("delivery_assignments")
            .select("*, orders(*, order_items(*), branches(*))")
            .eq("rider_id", riderId);

        if (status) {
            daQuery = daQuery.eq("status", status);
        }

        const { data: daData, error: daError } = await daQuery.order("created_at", { ascending: false });
        
        let orders = [];
        
        if (daError) {
            console.log('[RiderAPI] delivery_assignments query error, trying orders table:', daError.message);
        } else if (daData && daData.length > 0) {
            // Extract orders from delivery_assignments
            orders = daData.map(da => da.orders).filter(Boolean);
            console.log('[RiderAPI] Found', orders.length, 'orders from delivery_assignments');
        }
        
        // If no orders from delivery_assignments, try orders table directly
        if (orders.length === 0) {
            console.log('[RiderAPI] Trying orders.rider_id directly for:', riderId);
            let orderQuery = supabase
                .from("orders")
                .select("*, order_items(*), branches(*)")
                .eq("rider_id", riderId);

            if (status) {
                orderQuery = orderQuery.eq("status", status);
            }

            const { data: orderData, error: orderError } = await orderQuery.order("created_at", { ascending: false });
            
            if (!orderError && orderData) {
                orders = orderData;
                console.log('[RiderAPI] Found', orders.length, 'orders from orders.rider_id');
            }
        }
        
        console.log('[RiderAPI] Total orders found:', orders.length);
        return res.status(200).json({ ok: true, data: orders });
    }

    // POST /api/riders/:id/orders/:orderId/confirm
    if (req.method === "POST" && ordersIndex === 2 && urlParts.length === 5 && urlParts[4] === 'confirm') {
        const orderId = urlParts[3];
        
        console.log('[RiderAPI] Confirming order:', orderId, 'for rider:', riderId);
        
        // Update delivery_assignment status to confirmed
        const { data: da, error: daError } = await supabase
            .from("delivery_assignments")
            .update({ 
                status: "CONFIRMED",
                confirmed_at: new Date().toISOString()
            })
            .eq("order_id", orderId)
            .eq("rider_id", riderId)
            .select();

        if (daError) {
            console.error('[RiderAPI] Error confirming delivery assignment:', daError);
            return res.status(500).json({ ok: false, error: daError.message });
        }
        
        if (!da || da.length === 0) {
            return res.status(400).json({ ok: false, error: "Delivery assignment not found or already confirmed" });
        }
        
        // Also update the order status
        await supabase
            .from("orders")
            .update({ 
                status: "RIDER_CONFIRMED_DIGITAL",
                confirmed_at: new Date().toISOString()
            })
            .eq("id", orderId);
        
        return res.status(200).json({ ok: true, data: da[0] });
    }

    // POST /api/riders/:id/orders/:orderId/start
    if (req.method === "POST" && ordersIndex === 2 && urlParts.length === 5 && urlParts[4] === 'start') {
        const orderId = urlParts[3];
        
        console.log('[RiderAPI] Starting delivery for order:', orderId, 'rider:', riderId);
        
        // Update delivery_assignment status
        const { data: da, error: daError } = await supabase
            .from("delivery_assignments")
            .update({ 
                status: "OUT_FOR_DELIVERY",
                started_at: new Date().toISOString()
            })
            .eq("order_id", orderId)
            .eq("rider_id", riderId)
            .select();

        if (daError) {
            console.error('[RiderAPI] Error starting delivery:', daError);
            return res.status(500).json({ ok: false, error: daError.message });
        }
        
        if (!da || da.length === 0) {
            return res.status(400).json({ ok: false, error: "Delivery assignment not found or not in correct status" });
        }
        
        // Also update the order status
        await supabase
            .from("orders")
            .update({ 
                status: "OUT_FOR_DELIVERY",
                started_at: new Date().toISOString()
            })
            .eq("id", orderId);
        
        return res.status(200).json({ ok: true, data: da[0] });
    }

    // POST /api/riders/:id/orders/:orderId/complete
    if (req.method === "POST" && ordersIndex === 2 && urlParts.length === 5 && urlParts[4] === 'complete') {
        const orderId = urlParts[3];
        
        console.log('[RiderAPI] Completing delivery for order:', orderId, 'rider:', riderId);
        
        // Update delivery_assignment status
        const { data: da, error: daError } = await supabase
            .from("delivery_assignments")
            .update({ 
                status: "DELIVERED",
                delivered_at: new Date().toISOString()
            })
            .eq("order_id", orderId)
            .eq("rider_id", riderId)
            .select();

        if (daError) {
            console.error('[RiderAPI] Error completing delivery:', daError);
            return res.status(500).json({ ok: false, error: daError.message });
        }
        
        if (!da || da.length === 0) {
            return res.status(400).json({ ok: false, error: "Delivery assignment not found or not in correct status" });
        }
        
        // Also update the order status
        await supabase
            .from("orders")
            .update({ 
                status: "DELIVERED",
                delivered_at: new Date().toISOString()
            })
            .eq("id", orderId);
        
        return res.status(200).json({ ok: true, data: da[0] });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(404).json({ ok: false, error: "Route not found" });
};