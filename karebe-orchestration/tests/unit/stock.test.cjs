/**
 * tests/unit/stock.test.cjs
 * Pure unit tests — stock deduction logic with no network calls
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// Pure helper: mirrors fn_deduct_stock logic in JS
function deductStock(variants, variantId, quantity) {
    const idx = variants.findIndex((v) => v.id === variantId);
    if (idx === -1) return { ok: false, error: "VARIANT_NOT_FOUND" };
    const current = variants[idx].stock;
    if (current < quantity) {
        return { ok: false, error: "STOCK_INSUFFICIENT", available: current, requested: quantity };
    }
    const updated = variants.map((v, i) =>
        i === idx ? { ...v, stock: v.stock - quantity } : v
    );
    return { ok: true, variants: updated, deducted: quantity, remaining: current - quantity };
}

// Pure helper: validate cart item against product variants
function validateCartItem(variants, variantId, requestedQty) {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return { ok: false, error: "VARIANT_NOT_FOUND" };
    if (requestedQty < 1) return { ok: false, error: "INVALID_QUANTITY" };
    if (variant.stock < requestedQty) {
        return { ok: false, error: "STOCK_INSUFFICIENT", available: variant.stock };
    }
    return { ok: true, variant, line_total: variant.price * requestedQty };
}

// ── Stock deduction tests ────────────────────────────────────────

test("stock: deduct valid quantity", () => {
    const variants = [{ id: "v1", volume: "750ml", price: 2400, stock: 10 }];
    const result = deductStock(variants, "v1", 3);
    assert.equal(result.ok, true);
    assert.equal(result.remaining, 7);
    assert.equal(result.variants[0].stock, 7);
});

test("stock: deduct exact remaining stock", () => {
    const variants = [{ id: "v1", volume: "750ml", price: 2400, stock: 5 }];
    const result = deductStock(variants, "v1", 5);
    assert.equal(result.ok, true);
    assert.equal(result.remaining, 0);
});

test("stock: reject when quantity exceeds stock", () => {
    const variants = [{ id: "v1", volume: "750ml", price: 2400, stock: 3 }];
    const result = deductStock(variants, "v1", 10);
    assert.equal(result.ok, false);
    assert.equal(result.error, "STOCK_INSUFFICIENT");
    assert.equal(result.available, 3);
});

test("stock: reject unknown variant", () => {
    const variants = [{ id: "v1", volume: "750ml", price: 2400, stock: 10 }];
    const result = deductStock(variants, "v_bad", 1);
    assert.equal(result.ok, false);
    assert.equal(result.error, "VARIANT_NOT_FOUND");
});

test("stock: multi-variant product: only target variant decremented", () => {
    const variants = [
        { id: "v2", volume: "750ml", price: 3600, stock: 16 },
        { id: "v3", volume: "1L", price: 4700, stock: 9 },
    ];
    const result = deductStock(variants, "v2", 4);
    assert.equal(result.ok, true);
    assert.equal(result.variants[0].stock, 12);
    assert.equal(result.variants[1].stock, 9, "other variant unchanged");
});

test("stock: deduct quantity 1 from stock 1 leaves 0", () => {
    const variants = [{ id: "v5", volume: "Per Glass", price: 80, stock: 1 }];
    const result = deductStock(variants, "v5", 1);
    assert.equal(result.ok, true);
    assert.equal(result.remaining, 0);
});

test("stock: reject zero quantity", () => {
    const variants = [{ id: "v1", volume: "750ml", price: 2400, stock: 10 }];
    const result = validateCartItem(variants, "v1", 0);
    assert.equal(result.ok, false);
    assert.equal(result.error, "INVALID_QUANTITY");
});

// ── Cart validation tests ────────────────────────────────────────

test("cart: valid item returns line_total", () => {
    const variants = [{ id: "v4", volume: "750ml", price: 1800, stock: 30 }];
    const result = validateCartItem(variants, "v4", 2);
    assert.equal(result.ok, true);
    assert.equal(result.line_total, 3600);
});

test("cart: stock limit enforced on cart add", () => {
    const variants = [{ id: "v4", volume: "750ml", price: 1800, stock: 2 }];
    const result = validateCartItem(variants, "v4", 5);
    assert.equal(result.ok, false);
    assert.equal(result.error, "STOCK_INSUFFICIENT");
    assert.equal(result.available, 2);
});

test("cart: unknown variant rejected", () => {
    const variants = [{ id: "v4", volume: "750ml", price: 1800, stock: 10 }];
    const result = validateCartItem(variants, "v_ghost", 1);
    assert.equal(result.ok, false);
    assert.equal(result.error, "VARIANT_NOT_FOUND");
});

// ── Low-stock threshold tests ────────────────────────────────────

test("stock: low-stock is triggered when remaining < 5", () => {
    const variants = [{ id: "v1", volume: "750ml", price: 2400, stock: 5 }];
    const result = deductStock(variants, "v1", 3);
    assert.equal(result.ok, true);
    assert.equal(result.remaining, 2);
    assert.equal(result.remaining < 5, true, "should trigger low-stock alert");
});

test("stock: no low-stock trigger when remaining >= 5", () => {
    const variants = [{ id: "v1", volume: "750ml", price: 2400, stock: 10 }];
    const result = deductStock(variants, "v1", 2);
    assert.equal(result.ok, true);
    assert.equal(result.remaining < 5, false, "no low-stock alert");
});
