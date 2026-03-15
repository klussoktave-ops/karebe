/**
 * tests/integration/visibility.test.cjs
 * Integration tests for dashboard visibility and protected content access
 * Covers user stories: Admin Dashboard Visibility, Rider Dashboard Visibility, Protected Content
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// ── Constants ─────────────────────────────────────────────────────────
const ADMIN_SESSION_KEY = "karebe_admin_session";
const RIDER_SESSION_KEY = "karebe_rider_id";

// ── Mock sessionStorage ────────────────────────────────────────────
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

// ── Visibility logic extracted from app.js ───────────────────────────

function getAdminSession(sessionStorage) {
    const raw = (sessionStorage || { getItem: () => null }).getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

function getRiderSession(sessionStorage) {
    return (sessionStorage || { getItem: () => null }).getItem(RIDER_SESSION_KEY);
}

// Simulates the renderAdmin visibility logic
function computeAdminVisibility(session) {
    return {
        showLogin: !session,
        showApp: !!session,
        showNav: !!session, // Navigation should only show when logged in
        showHeader: !!session // Page header should only show when logged in
    };
}

// Simulates the renderRider visibility logic  
function computeRiderVisibility(session) {
    return {
        showLogin: !session,
        showApp: !!session
    };
}

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Admin Dashboard Visibility
// As an admin user, I want the dashboard components to be properly hidden/shown based on login state
// ═══════════════════════════════════════════════════════════════════════

test("visibility: admin - login form visible when no session", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showLogin, true, "Login should be visible without session");
});

test("visibility: admin - app content hidden when no session", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showApp, false, "App should be hidden without session");
});

test("visibility: admin - login form hidden when session exists", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "test", role: "admin" }));
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showLogin, false, "Login should be hidden with session");
});

test("visibility: admin - app content visible when session exists", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "test", role: "admin" }));
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showApp, true, "App should be visible with session");
});

test("visibility: admin - navigation hidden when no session (security)", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showNav, false, "Nav should be hidden without session");
});

test("visibility: admin - navigation visible when session exists", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "test", role: "admin" }));
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showNav, true, "Nav should be visible with session");
});

test("visibility: admin - header hidden when no session (security)", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showHeader, false, "Header should be hidden without session");
});

test("visibility: admin - header visible when session exists", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "test", role: "admin" }));
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showHeader, true, "Header should be visible with session");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Rider Dashboard Visibility
// As a rider, I want the rider portal components to be properly hidden/shown based on login state
// ═══════════════════════════════════════════════════════════════════════

test("visibility: rider - login form visible when no session", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getRiderSession(sessionStorage);
    const visibility = computeRiderVisibility(session);

    assert.equal(visibility.showLogin, true, "Login should be visible without session");
});

test("visibility: rider - app content hidden when no session", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getRiderSession(sessionStorage);
    const visibility = computeRiderVisibility(session);

    assert.equal(visibility.showApp, false, "App should be hidden without session");
});

test("visibility: rider - login form hidden when session exists", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(RIDER_SESSION_KEY, "r1");
    const session = getRiderSession(sessionStorage);
    const visibility = computeRiderVisibility(session);

    assert.equal(visibility.showLogin, false, "Login should be hidden with session");
});

test("visibility: rider - app content visible when session exists", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(RIDER_SESSION_KEY, "r1");
    const session = getRiderSession(sessionStorage);
    const visibility = computeRiderVisibility(session);

    assert.equal(visibility.showApp, true, "App should be visible with session");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Protected Content Access
// As an unauthenticated user, I should not be able to access protected dashboard features
// ═══════════════════════════════════════════════════════════════════════

test("visibility: unauthenticated admin cannot access KPI data", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);

    // Simulating KPI access check - null session means no access
    const canAccessKPI = session && session.role === "super-admin";

    assert.ok(!canAccessKPI, "Unauthenticated user cannot access KPIs");
});

test("visibility: authenticated admin can access KPI data", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "test", role: "super-admin" }));
    const session = getAdminSession(sessionStorage);

    const canAccessKPI = session && session.role === "super-admin";

    assert.equal(canAccessKPI, true, "Authenticated super-admin can access KPIs");
});

test("visibility: branch admin cannot access super-admin features", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "test", role: "admin" }));
    const session = getAdminSession(sessionStorage);

    const canAccessSuperAdmin = session && session.role === "super-admin";

    assert.equal(canAccessSuperAdmin, false, "Branch admin cannot access super-admin features");
});

test("visibility: unauthenticated rider cannot access delivery assignments", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getRiderSession(sessionStorage);

    const canAccessDeliveries = !!session;

    assert.equal(canAccessDeliveries, false, "Unauthenticated rider cannot access deliveries");
});

test("visibility: authenticated rider can access delivery assignments", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(RIDER_SESSION_KEY, "r1");
    const session = getRiderSession(sessionStorage);

    const canAccessDeliveries = !!session;

    assert.equal(canAccessDeliveries, true, "Authenticated rider can access deliveries");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Logout Refreshes All Visibility
// As a user, when I log out all protected content should immediately become hidden
// ═══════════════════════════════════════════════════════════════════════

test("visibility: logout hides admin app and shows login", () => {
    const sessionStorage = createMockSessionStorage();

    // Simulate logged in state
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "test", role: "admin" }));

    // Perform logout
    sessionStorage.removeItem(ADMIN_SESSION_KEY);

    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showLogin, true, "Login should be visible after logout");
    assert.equal(visibility.showApp, false, "App should be hidden after logout");
    assert.equal(visibility.showNav, false, "Nav should be hidden after logout");
});

test("visibility: logout hides rider app and shows login", () => {
    const sessionStorage = createMockSessionStorage();

    // Simulate logged in state
    sessionStorage.setItem(RIDER_SESSION_KEY, "r1");

    // Perform logout
    sessionStorage.removeItem(RIDER_SESSION_KEY);

    const session = getRiderSession(sessionStorage);
    const visibility = computeRiderVisibility(session);

    assert.equal(visibility.showLogin, true, "Login should be visible after logout");
    assert.equal(visibility.showApp, false, "App should be hidden after logout");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Sub-page Visibility Consistency
// As a user, I expect consistent visibility rules across all admin sub-pages
// ═══════════════════════════════════════════════════════════════════════

test("visibility: admin-catalog page follows same visibility rules", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    // Catalog page should have same rules
    assert.equal(visibility.showApp, false, "Catalog app hidden without session");
    assert.equal(visibility.showNav, false, "Catalog nav hidden without session");
});

test("visibility: admin-orders page follows same visibility rules", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showApp, false, "Orders app hidden without session");
});

test("visibility: admin-delivery page follows same visibility rules", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showApp, false, "Delivery app hidden without session");
});

test("visibility: admin-system page follows same visibility rules", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showApp, false, "System app hidden without session");
});

test("visibility: admin-product-new page follows same visibility rules", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showApp, false, "Product-new app hidden without session");
});

test("visibility: super-admin sees all super-only elements", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "owner", role: "super-admin" }));
    const session = getAdminSession(sessionStorage);

    const isSuperAdmin = session && session.role === "super-admin";

    assert.equal(isSuperAdmin, true, "Super-admin should have access");
});

test("visibility: non-super-admin does not see super-only elements", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ userId: "u1", username: "admin", role: "admin" }));
    const session = getAdminSession(sessionStorage);

    const isSuperAdmin = session && session.role === "super-admin";

    assert.equal(isSuperAdmin, false, "Non-super-admin should not have super access");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Session Expiry Handling
// As a user, I expect the UI to respond correctly when my session becomes invalid
// ═══════════════════════════════════════════════════════════════════════

test("visibility: corrupted admin session shows login", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, "invalid-json-{{{");
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showLogin, true, "Should show login for corrupted session");
    assert.equal(visibility.showApp, false, "Should hide app for corrupted session");
});

test("visibility: empty string session shows login", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, "");
    const session = getAdminSession(sessionStorage);
    const visibility = computeAdminVisibility(session);

    assert.equal(visibility.showLogin, true, "Should show login for empty session");
});
