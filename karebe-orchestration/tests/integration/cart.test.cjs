/**
 * tests/integration/cart.test.cjs
 * Integration tests for cart API logic using Supabase mock
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// ── In-memory Supabase mock ──────────────────────────────────────
function createSupabaseMock(db) {
    function tableClient(tableName) {
        let _filter = null;
        let _conflict = null;
        const api = {
            select(cols) { return api; },
            eq(col, val) { _filter = { col, val }; return api; },
            upsert(payload, opts) {
                _conflict = opts?.onConflict;
                const table = db[tableName] || (db[tableName] = []);
                const conflictKeys = _conflict ? _conflict.split(",").map(s => s.trim()) : [];
                if (_conflict) {
                    const idx = table.findIndex(row =>
                        conflictKeys.every(k => String(row[k]) === String(payload[k]))
                    );
                    if (idx >= 0) {
                        table[idx] = { ...table[idx], ...payload };
                    } else {
                        table.push({ id: "mock-" + table.length, ...payload });
                    }
                } else {
                    table.push({ id: "mock-" + table.length, ...payload });
                }
                const inserted = _conflict
                    ? table.find(r => conflictKeys.every(k => String(r[k]) === String(payload[k])))
                    : table[table.length - 1];
                return {
                    select() { return this; },
                    single() { return Promise.resolve({ data: inserted, error: null }); },
                };
            },
            delete() {
                return {
                    eq(col, val) {
                        db[tableName] = (db[tableName] || []).filter(r => String(r[col]) !== String(val));
                        return Promise.resolve({ error: null });
                    },
                };
            },
            async single() {
                const table = db[tableName] || [];
                const row = _filter ? table.find(r => String(r[_filter.col]) === String(_filter.val)) : table[0];
                return { data: row || null, error: row ? null : { message: "Not found" } };
            },
            then(resolve) {
                const table = db[tableName] || [];
                const rows = _filter ? table.filter(r => String(r[_filter.col]) === String(_filter.val)) : table;
                return resolve({ data: rows, error: null });
            },
        };
        return api;
    }
    return { from: (t) => tableClient(t) };
}

// ── Cart business logic (extracted from api/cart.js for testability) ──

function cartUpsert(db, supabase, { userId, productId, variantId, quantity, branchId }) {
    if (!userId || !productId || !variantId || quantity === undefined || quantity === null) {
        return Promise.resolve({ ok: false, error: "MISSING_FIELDS" });
    }
    if (quantity < 1) {
        return Promise.resolve({ ok: false, error: "INVALID_QUANTITY" });
    }

    const products = db.products || [];
    const prod = products.find(p => p.id === productId);
    if (!prod) return Promise.resolve({ ok: false, error: "PRODUCT_NOT_FOUND" });
    const variant = (prod.variants || []).find(v => v.id === variantId);
    if (!variant) return Promise.resolve({ ok: false, error: "VARIANT_NOT_FOUND" });
    if (variant.stock < quantity) {
        return Promise.resolve({ ok: false, error: "STOCK_INSUFFICIENT", available: variant.stock });
    }

    return supabase.from("cart_items").upsert(
        { user_id: userId, product_id: productId, variant_id: variantId, quantity, branch_id: branchId || null },
        { onConflict: "user_id,product_id,variant_id" }
    ).single();
}

function cartTotal(db, userId) {
    const items = (db.cart_items || []).filter(i => i.user_id === userId);
    const products = db.products || [];
    let total = 0;
    for (const item of items) {
        const prod = products.find(p => p.id === item.product_id);
        const variant = (prod?.variants || []).find(v => v.id === item.variant_id);
        if (variant) total += variant.price * item.quantity;
    }
    return total;
}

// ── Shared test products ─────────────────────────────────────────
const seedProducts = [
    { id: "p3", name: "Smirnoff Red", variants: [{ id: "v4", volume: "750ml", price: 1800, stock: 30 }] },
    { id: "p4", name: "Keg Beer", variants: [{ id: "v5", volume: "Per Glass", price: 80, stock: 500 }] },
    { id: "p1", name: "Nederburg Cabernet", variants: [{ id: "v1", volume: "750ml", price: 2400, stock: 2 }] },
];

// ── Tests ────────────────────────────────────────────────────────

test("cart: add valid item returns cart row", async () => {
    const db = { products: seedProducts };
    const supabase = createSupabaseMock(db);
    const { data, error } = await cartUpsert(db, supabase, {
        userId: "u1", productId: "p3", variantId: "v4", quantity: 2,
    });
    assert.ok(!error, "no error");
    assert.equal(data.user_id, "u1");
    assert.equal(data.quantity, 2);
});

test("cart: adding same product+variant upserts (no duplicate)", async () => {
    const db = { products: seedProducts };
    const supabase = createSupabaseMock(db);
    await cartUpsert(db, supabase, { userId: "u1", productId: "p3", variantId: "v4", quantity: 1 });
    await cartUpsert(db, supabase, { userId: "u1", productId: "p3", variantId: "v4", quantity: 3 });
    const rows = (db.cart_items || []).filter(r => r.user_id === "u1");
    assert.equal(rows.length, 1, "should be exactly one row after two upserts");
    assert.equal(rows[0].quantity, 3, "quantity should be updated to 3");
});

test("cart: cart_total recalculates correctly", async () => {
    const db = { products: seedProducts };
    const supabase = createSupabaseMock(db);
    await cartUpsert(db, supabase, { userId: "u2", productId: "p4", variantId: "v5", quantity: 3 });  // 3 × 80 = 240
    await cartUpsert(db, supabase, { userId: "u2", productId: "p3", variantId: "v4", quantity: 1 }); // 1 × 1800 = 1800
    const total = cartTotal(db, "u2");
    assert.equal(total, 2040, "cart total should be 2040");
});

test("cart: stock limit enforced on add", async () => {
    const db = { products: seedProducts };
    const supabase = createSupabaseMock(db);
    const result = await cartUpsert(db, supabase, { userId: "u3", productId: "p1", variantId: "v1", quantity: 10 });
    assert.equal(result.ok, false);
    assert.equal(result.error, "STOCK_INSUFFICIENT");
    assert.equal(result.available, 2);
});

test("cart: missing userId rejected", async () => {
    const db = { products: seedProducts };
    const supabase = createSupabaseMock(db);
    const result = await cartUpsert(db, supabase, { productId: "p3", variantId: "v4", quantity: 1 });
    assert.equal(result.ok, false);
    assert.equal(result.error, "MISSING_FIELDS");
});

test("cart: quantity < 1 rejected", async () => {
    const db = { products: seedProducts };
    const supabase = createSupabaseMock(db);
    const result = await cartUpsert(db, supabase, { userId: "u1", productId: "p3", variantId: "v4", quantity: 0 });
    assert.equal(result.ok, false);
    assert.equal(result.error, "INVALID_QUANTITY");
});

test("cart: total is 0 for empty cart", () => {
    const db = { products: seedProducts, cart_items: [] };
    const total = cartTotal(db, "u_nobody");
    assert.equal(total, 0);
});
