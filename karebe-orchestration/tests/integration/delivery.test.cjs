/**
 * tests/integration/delivery.test.cjs
 * Integration tests for delivery assignment and status progression
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// ── Delivery logic (mirrors Edge Function rules) ─────────────────

const VALID_TRANSITIONS = { assigned: "in_progress", in_progress: "completed" };

function assignDelivery(db, { orderId, riderId, notes }) {
    if (!orderId || !riderId) return { ok: false, error: "MISSING_FIELDS" };

    const orders = db.orders || [];
    const order = orders.find(o => o.id === orderId);
    if (!order) return { ok: false, error: "ORDER_NOT_FOUND" };

    const existing = (db.delivery_assignments || []).find(a => a.order_id === orderId);
    if (existing) {
        // Re-assign: update the existing record (upsert by order_id)
        existing.rider_id = riderId;
        existing.status = "assigned";
        existing.notes = notes || null;
        existing.updated_at = new Date().toISOString();
        return { ok: true, assignment: existing };
    }

    const assignment = {
        id: "da_" + Math.random().toString(36).slice(2),
        order_id: orderId, rider_id: riderId,
        status: "assigned", notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    db.delivery_assignments = db.delivery_assignments || [];
    db.delivery_assignments.push(assignment);

    // Update order status
    order.status = "confirmed";

    return { ok: true, assignment };
}

function updateDeliveryStatus(db, { assignmentId, riderId, status }) {
    if (!assignmentId || !status) return { ok: false, error: "MISSING_FIELDS" };

    const assignment = (db.delivery_assignments || []).find(a => a.id === assignmentId);
    if (!assignment) return { ok: false, error: "NOT_FOUND" };

    if (riderId && assignment.rider_id !== riderId) {
        return { ok: false, error: "FORBIDDEN" };
    }

    const expectedNext = VALID_TRANSITIONS[assignment.status];
    if (!expectedNext) return { ok: false, error: "ALREADY_COMPLETED" };
    if (status !== expectedNext) {
        return {
            ok: false, error: "INVALID_TRANSITION",
            message: `Cannot go from '${assignment.status}' to '${status}', expected '${expectedNext}'`,
        };
    }

    assignment.status = status;
    assignment.updated_at = new Date().toISOString();

    // Cascade to order
    const order = (db.orders || []).find(o => o.id === assignment.order_id);
    if (order) {
        if (status === "in_progress") order.status = "dispatched";
        if (status === "completed") order.status = "delivered";
    }

    return { ok: true, assignment };
}

// ── Shared seed ──────────────────────────────────────────────────
function makeDb() {
    return {
        orders: [
            { id: "ord_001", status: "pending", branch_id: "b_wangige" },
            { id: "ord_002", status: "confirmed", branch_id: "b_wangige" },
        ],
        delivery_assignments: [],
    };
}

// ── Tests ────────────────────────────────────────────────────────

test("delivery: assign rider creates assignment row", () => {
    const db = makeDb();
    const result = assignDelivery(db, { orderId: "ord_001", riderId: "r1" });
    assert.equal(result.ok, true);
    assert.equal(result.assignment.status, "assigned");
    assert.equal(db.delivery_assignments.length, 1);
});

test("delivery: order status updates to confirmed after assignment", () => {
    const db = makeDb();
    assignDelivery(db, { orderId: "ord_001", riderId: "r1" });
    const order = db.orders.find(o => o.id === "ord_001");
    assert.equal(order.status, "confirmed");
});

test("delivery: duplicate assignment updates existing (one per order)", () => {
    const db = makeDb();
    assignDelivery(db, { orderId: "ord_001", riderId: "r1" });
    assignDelivery(db, { orderId: "ord_001", riderId: "r2" }); // re-assign
    assert.equal(db.delivery_assignments.length, 1, "still exactly one assignment");
    assert.equal(db.delivery_assignments[0].rider_id, "r2", "rider updated to r2");
});

test("delivery: missing orderId rejected", () => {
    const db = makeDb();
    const result = assignDelivery(db, { riderId: "r1" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "MISSING_FIELDS");
});

test("delivery: assignment for unknown order rejected", () => {
    const db = makeDb();
    const result = assignDelivery(db, { orderId: "ord_ghost", riderId: "r1" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "ORDER_NOT_FOUND");
});

test("delivery: status advances assigned → in_progress", () => {
    const db = makeDb();
    const { assignment } = assignDelivery(db, { orderId: "ord_001", riderId: "r1" });
    const result = updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r1", status: "in_progress" });
    assert.equal(result.ok, true);
    assert.equal(result.assignment.status, "in_progress");
});

test("delivery: status advances in_progress → completed", () => {
    const db = makeDb();
    const { assignment } = assignDelivery(db, { orderId: "ord_001", riderId: "r1" });
    updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r1", status: "in_progress" });
    const result = updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r1", status: "completed" });
    assert.equal(result.ok, true);
    assert.equal(result.assignment.status, "completed");
});

test("delivery: order status → dispatched when delivery in_progress", () => {
    const db = makeDb();
    const { assignment } = assignDelivery(db, { orderId: "ord_001", riderId: "r1" });
    updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r1", status: "in_progress" });
    assert.equal(db.orders.find(o => o.id === "ord_001").status, "dispatched");
});

test("delivery: order status → delivered when delivery completed", () => {
    const db = makeDb();
    const { assignment } = assignDelivery(db, { orderId: "ord_001", riderId: "r1" });
    updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r1", status: "in_progress" });
    updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r1", status: "completed" });
    assert.equal(db.orders.find(o => o.id === "ord_001").status, "delivered");
});

test("delivery: cannot skip from assigned → completed", () => {
    const db = makeDb();
    const { assignment } = assignDelivery(db, { orderId: "ord_001", riderId: "r1" });
    const result = updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r1", status: "completed" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "INVALID_TRANSITION");
});

test("delivery: wrong rider gets FORBIDDEN", () => {
    const db = makeDb();
    const { assignment } = assignDelivery(db, { orderId: "ord_001", riderId: "r1" });
    const result = updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r_intruder", status: "in_progress" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "FORBIDDEN");
});

test("delivery: updating already-completed returns ALREADY_COMPLETED", () => {
    const db = makeDb();
    const { assignment } = assignDelivery(db, { orderId: "ord_001", riderId: "r1" });
    updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r1", status: "in_progress" });
    updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r1", status: "completed" });
    const result = updateDeliveryStatus(db, { assignmentId: assignment.id, riderId: "r1", status: "completed" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "ALREADY_COMPLETED");
});
