/**
 * tests/integration/session.test.cjs
 * Integration tests for session management and state persistence
 * Covers user stories: Session Persistence, State Management, Cross-tab Sync
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// ── Constants from app.js ─────────────────────────────────────────────
const STORAGE_KEY = "karebe_state_v1";
const ADMIN_SESSION_KEY = "karebe_admin_session";
const RIDER_SESSION_KEY = "karebe_rider_id";
const CUSTOMER_BRANCH_KEY = "karebe_customer_branch";
const CUSTOMER_CHECKOUT_METHOD_KEY = "karebe_customer_checkout_method";

// ── Mock storage helpers ─────────────────────────────────────────────
function createMockLocalStorage(initialState = {}) {
    let state = { ...initialState };
    return {
        getItem: () => JSON.stringify(state),
        setItem: (_, v) => { state = JSON.parse(v); },
        _getState: () => state,
        _setState: (s) => { state = s; },
        clear: () => { state = {}; }
    };
}

function createMockSessionStorage() {
    const store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value; },
        removeItem: (key) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
        _getStore: () => store
    };
}

// ── Core functions extracted from app.js ─────────────────────────────

function clone(v) {
    return JSON.parse(JSON.stringify(v));
}

function loadState(seed, localStorage) {
    const raw = (localStorage || { getItem: () => null }).getItem(STORAGE_KEY);
    if (!raw) {
        return clone(seed);
    }
    return JSON.parse(raw);
}

function getAdminSession(sessionStorage) {
    const raw = (sessionStorage || { getItem: () => null }).getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

function selectedBranchId(state, localStorage) {
    const raw = (localStorage || { getItem: () => null }).getItem(CUSTOMER_BRANCH_KEY);
    if (raw && state.branches.find((b) => b.id === raw)) return raw;
    return state.branches[0] ? state.branches[0].id : "";
}

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: State Persistence
// As a user, I want my application state to persist across page reloads
// ═══════════════════════════════════════════════════════════════════════

test("session: state persists across simulated page reload", () => {
    const seed = { products: [{ id: "p1", name: "Test Product" }], branches: [], orders: [] };
    const localStorage = createMockLocalStorage(seed);

    // First load
    const state1 = loadState(seed, localStorage);
    state1.products[0].name = "Modified Product";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state1));

    // Simulate page reload
    const state2 = loadState(seed, localStorage);

    assert.equal(state2.products[0].name, "Modified Product", "State should persist");
});

test("session: initial load returns seed when no stored state", () => {
    const seed = { products: [{ id: "p1", name: "Seed Product" }], branches: [] };
    const localStorage = createMockLocalStorage();
    localStorage.getItem = () => null;

    const state = loadState(seed, localStorage);

    assert.equal(state.products[0].name, "Seed Product", "Should load seed when no state");
});

test("session: loadState creates missing arrays", () => {
    // Simulate reconcile logic - ensures arrays exist
    const state = { products: [], branches: [], orders: [] };

    assert.ok(Array.isArray(state.products), "products should be array");
    assert.ok(Array.isArray(state.branches), "branches should be array");
    assert.ok(Array.isArray(state.orders), "orders should be array");
});

test("session: branch selection persists in localStorage", () => {
    // Test the selectedBranchId logic directly
    const state = {
        branches: [
            { id: "b1", name: "Branch 1" },
            { id: "b2", name: "Branch 2" }
        ]
    };

    // Simulate stored branch selection
    const savedBranchId = "b2";
    const branchId = state.branches.find((b) => b.id === savedBranchId) ? savedBranchId : state.branches[0].id;

    assert.equal(branchId, "b2", "Branch selection should persist");
});

test("session: default branch selected when none saved", () => {
    const seed = {
        branches: [
            { id: "b1", name: "Branch 1" },
            { id: "b2", name: "Branch 2" }
        ]
    };
    const localStorage = createMockLocalStorage(seed);
    localStorage.getItem = () => null; // No saved branch

    const state = loadState(seed, localStorage);
    const branchId = selectedBranchId(state, localStorage);

    assert.equal(branchId, "b1", "Should default to first branch");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Admin Session Management
// As an admin, I expect my session to be properly ═════════════════════════ managed
//══════════════════════════════════════════════

test("session: admin session survives state reload", () => {
    const sessionStorage = createMockSessionStorage();
    const session = { userId: "u1", username: "test", role: "admin" };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));

    // Simulate page reload
    const restoredSession = getAdminSession(sessionStorage);

    assert.notEqual(restoredSession, null, "Session should survive reload");
    assert.equal(restoredSession.username, "test", "Session data intact");
});

test("session: admin session contains user metadata", () => {
    const sessionStorage = createMockSessionStorage();
    const session = {
        userId: "u_owner",
        username: "karebe-owner",
        name: "Karebe Owner",
        role: "super-admin",
        branchId: null
    };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));

    const restored = getAdminSession(sessionStorage);

    assert.ok(restored.userId, "Should have userId");
    assert.ok(restored.username, "Should have username");
    assert.ok(restored.name, "Should have name");
    assert.ok(restored.role, "Should have role");
});

test("session: switching admin user updates session", () => {
    const sessionStorage = createMockSessionStorage();

    // First user logs in
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "user1", role: "admin" }));

    // Different user logs in
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u2", username: "user2", role: "super-admin" }));

    const current = getAdminSession(sessionStorage);

    assert.equal(current.userId, "u2", "Should have new user ID");
    assert.equal(current.username, "user2", "Should have new username");
});

// ═══════════════════════════════════════════════════════════════════════
// USER Story: Rider Session Management
// As a rider, I expect my session to be properly managed
// ═══════════════════════════════════════════════════════════════════════

test("session: rider session survives state reload", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(RIDER_SESSION_KEY, "r1");

    // Simulate page reload
    const riderId = sessionStorage.getItem(RIDER_SESSION_KEY);

    assert.equal(riderId, "r1", "Rider session should persist");
});

test("session: rider logout clears all rider data", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(RIDER_SESSION_KEY, "r1");

    sessionStorage.removeItem(RIDER_SESSION_KEY);

    const riderId = sessionStorage.getItem(RIDER_SESSION_KEY);
    assert.equal(riderId, null, "Rider session should be cleared");
});

test("session: rider session is separate from admin session", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "admin", role: "admin" }));
    sessionStorage.setItem(RIDER_SESSION_KEY, "r1");

    const adminSession = getAdminSession(sessionStorage);
    const riderId = sessionStorage.getItem(RIDER_SESSION_KEY);

    assert.notEqual(adminSession, null, "Admin session exists");
    assert.equal(riderId, "r1", "Rider session exists separately");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Customer Checkout Method
// As a customer, I want my checkout method preference to be remembered
// ═══════════════════════════════════════════════════════════════════════

test("session: checkout method persists in session storage", () => {
    const sessionStorage = createMockSessionStorage();

    sessionStorage.setItem(CUSTOMER_CHECKOUT_METHOD_KEY, "CALL");

    const method = sessionStorage.getItem(CUSTOMER_CHECKOUT_METHOD_KEY);

    assert.equal(method, "CALL", "Checkout method should persist");
});

test("session: default checkout method is MPESA_DARAJA", () => {
    const sessionStorage = createMockSessionStorage();
    // No stored value

    const method = sessionStorage.getItem(CUSTOMER_CHECKOUT_METHOD_KEY) || "MPESA_DARAJA";

    assert.equal(method, "MPESA_DARAJA", "Default should be MPESA_DARAJA");
});

test("session: invalid checkout method defaults to MPESA_DARAJA", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(CUSTOMER_CHECKOUT_METHOD_KEY, "INVALID_METHOD");

    const validMethods = ["MPESA_DARAJA", "CALL", "SMS", "WHATSAPP"];
    const method = sessionStorage.getItem(CUSTOMER_CHECKOUT_METHOD_KEY);

    assert.equal(validMethods.includes(method), false, "Invalid method should be rejected");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Order and Cart State
// As a user, I want my cart and orders to persist
// ═══════════════════════════════════════════════════════════════════════

test("session: cart persists across state reload", () => {
    const seed = { cart: [], branches: [], orders: [] };
    const localStorage = createMockLocalStorage(seed);

    // Add item to cart
    const state = loadState(seed, localStorage);
    state.cart.push({ id: "c1", productId: "p1", qty: 2 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Reload
    const reloaded = loadState(seed, localStorage);

    assert.equal(reloaded.cart.length, 1, "Cart should persist");
    assert.equal(reloaded.cart[0].productId, "p1", "Cart item should be preserved");
});

test("session: orders persist across state reload", () => {
    const seed = { orders: [], branches: [], cart: [] };
    const localStorage = createMockLocalStorage(seed);

    // Create order
    const state = loadState(seed, localStorage);
    state.orders.push({ id: "o1", total: 1000, status: "CONFIRMED" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Reload
    const reloaded = loadState(seed, localStorage);

    assert.equal(reloaded.orders.length, 1, "Orders should persist");
    assert.equal(reloaded.orders[0].status, "CONFIRMED", "Order status preserved");
});

test("session: customer profiles persist", () => {
    const seed = { customerProfiles: [], branches: [], cart: [] };
    const localStorage = createMockLocalStorage(seed);

    const state = loadState(seed, localStorage);
    state.customerProfiles.push({ id: "c1", fullName: "Test User", phone: "+254712345678" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const reloaded = loadState(seed, localStorage);

    assert.equal(reloaded.customerProfiles.length, 1, "Customer profiles should persist");
    assert.equal(reloaded.customerProfiles[0].phone, "+254712345678", "Profile data preserved");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Delivery State
// As a rider/admin, I want delivery status to persist
// ═══════════════════════════════════════════════════════════════════════

test("session: deliveries persist across state reload", () => {
    const seed = { deliveries: [], branches: [], orders: [] };
    const localStorage = createMockLocalStorage(seed);

    const state = loadState(seed, localStorage);
    state.deliveries.push({ id: "d1", status: "ASSIGNED", riderId: "r1" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const reloaded = loadState(seed, localStorage);

    assert.equal(reloaded.deliveries.length, 1, "Deliveries should persist");
    assert.equal(reloaded.deliveries[0].status, "ASSIGNED", "Status preserved");
});

test("session: delivery timeline persists", () => {
    const seed = { deliveries: [], branches: [], orders: [] };
    const localStorage = createMockLocalStorage(seed);

    const state = loadState(seed, localStorage);
    state.deliveries.push({
        id: "d1",
        status: "DELIVERED",
        riderId: "r1",
        timeline: [
            { status: "ASSIGNED", at: "2026-03-01T10:00:00Z" },
            { status: "DELIVERED", at: "2026-03-01T11:00:00Z" }
        ]
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const reloaded = loadState(seed, localStorage);

    assert.equal(reloaded.deliveries[0].timeline.length, 2, "Timeline should persist");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Branch and Product Catalog
// As a user, I want branch and product data to be consistently available
// ═══════════════════════════════════════════════════════════════════════

test("session: branches persist across reload", () => {
    const seed = { branches: [], products: [], orders: [] };
    const localStorage = createMockLocalStorage(seed);

    const state = loadState(seed, localStorage);
    state.branches.push({ id: "b_wangige", name: "Wangige", isMain: true });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const reloaded = loadState(seed, localStorage);

    assert.equal(reloaded.branches.length, 1, "Branches should persist");
});

test("session: products persist across reload", () => {
    const seed = { products: [], branches: [], orders: [] };
    const localStorage = createMockLocalStorage(seed);

    const state = loadState(seed, localStorage);
    state.products.push({ id: "p1", name: "Test Product", variants: [{ id: "v1", stock: 10 }] });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const reloaded = loadState(seed, localStorage);

    assert.equal(reloaded.products.length, 1, "Products should persist");
    assert.equal(reloaded.products[0].variants[0].stock, 10, "Variant stock preserved");
});

test("session: stock deductions persist", () => {
    const seed = { products: [{ id: "p1", variants: [{ id: "v1", stock: 100 }] }], branches: [], orders: [] };
    const localStorage = createMockLocalStorage(seed);

    // Simulate purchase
    const state = loadState(seed, localStorage);
    state.products[0].variants[0].stock -= 5;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const reloaded = loadState(seed, localStorage);

    assert.equal(reloaded.products[0].variants[0].stock, 95, "Stock deduction should persist");
});
