/**
 * tests/integration/checkout.test.cjs
 * Integration tests for checkout flow using in-memory mock
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// ── Checkout logic (mirrors Edge Function validation) ────────────

function checkout(db, { userId, deliveryChannel, paymentMethod, branchId, customerPhone }) {
    if (!deliveryChannel || !paymentMethod) {
        return { ok: false, error: "MISSING_FIELDS" };
    }

    const cartItems = (db.cart_items || []).filter(i => i.user_id === userId);
    if (cartItems.length === 0) {
        return { ok: false, error: "EMPTY_CART" };
    }

    // Validate stock for all items
    for (const item of cartItems) {
        const prod = (db.products || []).find(p => p.id === item.product_id);
        if (!prod) return { ok: false, error: "PRODUCT_NOT_FOUND", product_id: item.product_id };
        const variant = (prod.variants || []).find(v => v.id === item.variant_id);
        if (!variant) return { ok: false, error: "VARIANT_NOT_FOUND", variant_id: item.variant_id };
        if (variant.stock < item.quantity) {
            return {
                ok: false, error: "STOCK_INSUFFICIENT",
                product_id: item.product_id, variant_id: item.variant_id,
                available: variant.stock, requested: item.quantity,
            };
        }
    }

    // Create order
    const orderId = "ord_" + Date.now();
    let total = 0;
    const orderItems = [];

    for (const item of cartItems) {
        const prod = db.products.find(p => p.id === item.product_id);
        const variant = prod.variants.find(v => v.id === item.variant_id);
        const lineTotal = variant.price * item.quantity;
        total += lineTotal;

        orderItems.push({
            id: "oi_" + Math.random().toString(36).slice(2),
            order_id: orderId,
            product_id: item.product_id,
            product_name: prod.name,
            variant_id: item.variant_id,
            volume: variant.volume,
            quantity: item.quantity,
            price: variant.price,
            line_total: lineTotal,
        });

        // Deduct stock (atomic in real DB via trigger)
        variant.stock -= item.quantity;
    }

    const order = {
        id: orderId, user_id: userId, customer_phone: customerPhone,
        total, status: "pending",
        payment_method: paymentMethod, delivery_channel: deliveryChannel,
        branch_id: branchId || null,
        created_at: new Date().toISOString(),
    };

    db.orders = db.orders || [];
    db.orders.push(order);
    db.order_items = (db.order_items || []).concat(orderItems);

    // Clear cart
    db.cart_items = db.cart_items.filter(i => i.user_id !== userId);

    return { ok: true, order: { ...order, order_items: orderItems } };
}

// ── Shared seed data ─────────────────────────────────────────────
function makeDb() {
    return {
        products: [
            { id: "p3", name: "Smirnoff Red", variants: [{ id: "v4", volume: "750ml", price: 1800, stock: 30 }] },
            { id: "p4", name: "Keg Beer", variants: [{ id: "v5", volume: "Per Glass", price: 80, stock: 500 }] },
            { id: "p1", name: "Niederburg", variants: [{ id: "v1", volume: "750ml", price: 2400, stock: 1 }] },
        ],
        cart_items: [
            { id: "c1", user_id: "u1", product_id: "p4", variant_id: "v5", quantity: 3 },
            { id: "c2", user_id: "u1", product_id: "p3", variant_id: "v4", quantity: 1 },
        ],
        orders: [],
        order_items: [],
    };
}

// ── Tests ────────────────────────────────────────────────────────

test("checkout: valid cart creates order with correct total", () => {
    const db = makeDb();
    const result = checkout(db, { userId: "u1", deliveryChannel: "PICKUP", paymentMethod: "CASH" });
    assert.equal(result.ok, true);
    assert.equal(result.order.total, 3 * 80 + 1 * 1800); // 240 + 1800 = 2040
    assert.equal(result.order.status, "pending");
});

test("checkout: order_items match cart contents", () => {
    const db = makeDb();
    const result = checkout(db, { userId: "u1", deliveryChannel: "DELIVERY", paymentMethod: "MPESA_DARAJA" });
    assert.equal(result.ok, true);
    assert.equal(result.order.order_items.length, 2);
    const keg = result.order.order_items.find(i => i.product_id === "p4");
    assert.equal(keg.quantity, 3);
    assert.equal(keg.line_total, 240);
});

test("checkout: cart_items cleared after checkout", () => {
    const db = makeDb();
    checkout(db, { userId: "u1", deliveryChannel: "PICKUP", paymentMethod: "CASH" });
    const remaining = (db.cart_items || []).filter(i => i.user_id === "u1");
    assert.equal(remaining.length, 0, "cart should be empty after checkout");
});

test("checkout: stock deducted after checkout", () => {
    const db = makeDb();
    checkout(db, { userId: "u1", deliveryChannel: "PICKUP", paymentMethod: "CASH" });
    const kegVariant = db.products.find(p => p.id === "p4").variants[0];
    assert.equal(kegVariant.stock, 500 - 3, "Keg stock decremented by 3");
});

test("checkout: empty cart rejected", () => {
    const db = makeDb();
    db.cart_items = [];
    const result = checkout(db, { userId: "u_empty", deliveryChannel: "PICKUP", paymentMethod: "CASH" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "EMPTY_CART");
});

test("checkout: insufficient stock rejected before order created", () => {
    const db = makeDb();
    // Put user with 5 keg beers in cart but stock is 500 → fine; override stock to 1
    db.products.find(p => p.id === "p4").variants[0].stock = 1;
    const result = checkout(db, { userId: "u1", deliveryChannel: "PICKUP", paymentMethod: "CASH" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "STOCK_INSUFFICIENT");
    assert.equal(db.orders.length, 0, "no order created on stock failure");
});

test("checkout: missing deliveryChannel rejected", () => {
    const db = makeDb();
    const result = checkout(db, { userId: "u1", paymentMethod: "CASH" });
    assert.equal(result.ok, false);
    assert.equal(result.error, "MISSING_FIELDS");
});

test("checkout: order stored in db.orders", () => {
    const db = makeDb();
    checkout(db, { userId: "u1", deliveryChannel: "DELIVERY", paymentMethod: "MPESA_DARAJA", branchId: "b_wangige" });
    assert.equal(db.orders.length, 1);
    assert.equal(db.orders[0].branch_id, "b_wangige");
    assert.equal(db.orders[0].payment_method, "MPESA_DARAJA");
});
