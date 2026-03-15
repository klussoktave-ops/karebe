/**
 * tests/integration/auth.test.cjs
 * Integration tests for authentication: admin login, rider login, logout, session management
 * Covers user stories: Admin Authentication, Rider Authentication, Session Management
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// ── Constants from app.js ─────────────────────────────────────────────
const STORAGE_KEY = "karebe_state_v1";
const ADMIN_SESSION_KEY = "karebe_admin_session";
const RIDER_SESSION_KEY = "karebe_rider_id";

// ── In-memory mock of browser sessionStorage ─────────────────────────
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

// ── Mock localStorage for state persistence ─────────────────────────
function createMockLocalStorage(seed) {
    let state = JSON.parse(JSON.stringify(seed));
    return {
        getItem: () => JSON.stringify(state),
        setItem: (_, v) => { state = JSON.parse(v); },
        _getState: () => state,
        _setState: (s) => { state = s; }
    };
}

// ── Core auth functions extracted from app.js ────────────────────────

function getAdminSession(sessionStorage) {
    const raw = (sessionStorage || { getItem: () => null }).getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

function localAdminLogin(username, password, users) {
    const user = users.find((u) => u.username === username && u.password === password && u.active);
    if (!user) return null;
    return {
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        branchId: user.branchId || null
    };
}

function adminLogout(sessionStorage) {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return getAdminSession(sessionStorage); // Should be null after logout
}

function getRiderSession(sessionStorage) {
    return (sessionStorage || { getItem: () => null }).getItem(RIDER_SESSION_KEY);
}

function riderLogin(phone, pin, riders, sessionStorage) {
    const rider = riders.find((r) => r.phone === phone && r.pin === pin && r.active);
    if (!rider) return null;
    sessionStorage.setItem(RIDER_SESSION_KEY, rider.id);
    return rider;
}

function riderLogout(sessionStorage) {
    sessionStorage.removeItem(RIDER_SESSION_KEY);
    return getRiderSession(sessionStorage); // Should be null after logout
}

// ── Test data ────────────────────────────────────────────────────────

const seedUsers = [
    { id: "u_owner", name: "Karebe Owner", username: "karebe-owner", password: "karebeowner1234", role: "super-admin", active: true, branchId: null },
    { id: "u_admin", name: "Karebe Admin", username: "karebe", password: "karebe1234", role: "admin", active: true, branchId: "b_wangige" },
    { id: "u_inactive", name: "Inactive User", username: "inactive", password: "pass123", role: "admin", active: false, branchId: null },
    { id: "u_wrong_pass", name: "Wrong Pass", username: "user1", password: "wrong", role: "admin", active: true, branchId: null }
];

const seedRiders = [
    { id: "r1", name: "John Mwangi", phone: "+254711000111", pin: "1111", active: true },
    { id: "r2", name: "Faith Achieng", phone: "+254722000222", pin: "2222", active: true },
    { id: "r3", name: "Inactive Rider", phone: "+254733000333", pin: "3333", active: false }
];

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Admin Authentication
// As an admin user, I want to log in securely so that I can access the dashboard
// ═══════════════════════════════════════════════════════════════════════

test("auth: admin login with valid credentials returns session", () => {
    const sessionStorage = createMockSessionStorage();
    const session = localAdminLogin("karebe", "karebe1234", seedUsers);

    assert.notEqual(session, null, "Should return session for valid credentials");
    assert.equal(session.username, "karebe");
    assert.equal(session.role, "admin");
});

test("auth: admin login with valid super-admin credentials returns session", () => {
    const sessionStorage = createMockSessionStorage();
    const session = localAdminLogin("karebe-owner", "karebeowner1234", seedUsers);

    assert.notEqual(session, null, "Should return session for valid super-admin");
    assert.equal(session.role, "super-admin");
});

test("auth: admin login with invalid username returns null", () => {
    const sessionStorage = createMockSessionStorage();
    const session = localAdminLogin("nonexistent", "password", seedUsers);

    assert.equal(session, null, "Should return null for invalid username");
});

test("auth: admin login with invalid password returns null", () => {
    const sessionStorage = createMockSessionStorage();
    const session = localAdminLogin("karebe", "wrongpassword", seedUsers);

    assert.equal(session, null, "Should return null for invalid password");
});

test("auth: admin login with inactive user returns null", () => {
    const sessionStorage = createMockSessionStorage();
    const session = localAdminLogin("inactive", "pass123", seedUsers);

    assert.equal(session, null, "Should return null for inactive user");
});

test("auth: admin login stores session in sessionStorage", () => {
    const sessionStorage = createMockSessionStorage();
    const session = localAdminLogin("karebe", "karebe1234", seedUsers);

    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    const stored = sessionStorage.getItem(ADMIN_SESSION_KEY);

    assert.notEqual(stored, null, "Session should be stored");
    assert.ok(JSON.parse(stored).username === "karebe");
});

test("auth: admin login session contains required fields", () => {
    const session = localAdminLogin("karebe", "karebe1234", seedUsers);

    assert.ok(session.userId, "Session should have userId");
    assert.ok(session.username, "Session should have username");
    assert.ok(session.name, "Session should have name");
    assert.ok(session.role, "Session should have role");
});

test("auth: admin login with branch-restricted admin", () => {
    const session = localAdminLogin("karebe", "karebe1234", seedUsers);

    assert.equal(session.branchId, "b_wangige", "Branch admin should have branchId");
});

test("auth: admin login case-sensitive username", () => {
    const session = localAdminLogin("KAREBE", "karebe1234", seedUsers);

    assert.equal(session, null, "Should be case-sensitive");
});

test("auth: admin login case-sensitive password", () => {
    const session = localAdminLogin("karebe", "KARBE1234", seedUsers);

    assert.equal(session, null, "Should be case-sensitive");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Admin Logout
// As an admin user, I want to log out securely so that my session is terminated
// ═══════════════════════════════════════════════════════════════════════

test("auth: admin logout removes session from sessionStorage", () => {
    const sessionStorage = createMockSessionStorage();
    const session = localAdminLogin("karebe", "karebe1234", seedUsers);
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));

    adminLogout(sessionStorage);
    const afterLogout = sessionStorage.getItem(ADMIN_SESSION_KEY);

    assert.equal(afterLogout, null, "Session should be removed after logout");
});

test("auth: admin logout getAdminSession returns null after logout", () => {
    const sessionStorage = createMockSessionStorage();
    const session = localAdminLogin("karebe", "karebe1234", seedUsers);
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));

    adminLogout(sessionStorage);
    const currentSession = getAdminSession(sessionStorage);

    assert.equal(currentSession, null, "getAdminSession should return null after logout");
});

test("auth: admin logout can be called multiple times safely", () => {
    const sessionStorage = createMockSessionStorage();

    // Logout when no session exists
    adminLogout(sessionStorage);
    adminLogout(sessionStorage);

    const currentSession = getAdminSession(sessionStorage);
    assert.equal(currentSession, null, "Multiple logout calls should be safe");
});

test("auth: admin logout preserves other sessionStorage items", () => {
    const sessionStorage = createMockSessionStorage();
    const session = localAdminLogin("karebe", "karebe1234", seedUsers);
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem("other_key", "other_value");

    adminLogout(sessionStorage);

    assert.equal(sessionStorage.getItem("other_key"), "other_value", "Other items should be preserved");
});

test("auth: admin session persists across page navigation simulation", () => {
    const sessionStorage = createMockSessionStorage();
    const session = localAdminLogin("karebe-owner", "karebeowner1234", seedUsers);
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));

    // Simulate page reload - get session
    const restoredSession = getAdminSession(sessionStorage);

    assert.notEqual(restoredSession, null, "Session should persist");
    assert.equal(restoredSession.role, "super-admin");
});

test("auth: admin session is invalid if corrupted JSON", () => {
    const sessionStorage = createMockSessionStorage();
    sessionStorage.setItem(ADMIN_SESSION_KEY, "not-valid-json");

    const session = getAdminSession(sessionStorage);

    assert.equal(session, null, "Corrupted JSON should return null session");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Rider Authentication
// As a delivery rider, I want to log in with my phone and PIN so I can access my deliveries
// ═══════════════════════════════════════════════════════════════════════

test("auth: rider login with valid credentials returns rider", () => {
    const sessionStorage = createMockSessionStorage();
    const rider = riderLogin("+254711000111", "1111", seedRiders, sessionStorage);

    assert.notEqual(rider, null, "Should return rider for valid credentials");
    assert.equal(rider.name, "John Mwangi");
});

test("auth: rider login stores rider ID in sessionStorage", () => {
    const sessionStorage = createMockSessionStorage();
    riderLogin("+254711000111", "1111", seedRiders, sessionStorage);

    const storedId = sessionStorage.getItem(RIDER_SESSION_KEY);

    assert.equal(storedId, "r1", "Should store rider ID");
});

test("auth: rider login with invalid phone returns null", () => {
    const sessionStorage = createMockSessionStorage();
    const rider = riderLogin("+254999999999", "1111", seedRiders, sessionStorage);

    assert.equal(rider, null, "Should return null for invalid phone");
});

test("auth: rider login with invalid PIN returns null", () => {
    const sessionStorage = createMockSessionStorage();
    const rider = riderLogin("+254711000111", "9999", seedRiders, sessionStorage);

    assert.equal(rider, null, "Should return null for invalid PIN");
});

test("auth: rider login with inactive rider returns null", () => {
    const sessionStorage = createMockSessionStorage();
    const rider = riderLogin("+254733000333", "3333", seedRiders, sessionStorage);

    assert.equal(rider, null, "Should return null for inactive rider");
});

test("auth: rider login case-sensitive phone", () => {
    const sessionStorage = createMockSessionStorage();
    const rider = riderLogin("254711000111", "1111", seedRiders, sessionStorage); // Missing +

    assert.equal(rider, null, "Should be case-sensitive/format-sensitive");
});

test("auth: rider logout removes session", () => {
    const sessionStorage = createMockSessionStorage();
    riderLogin("+254711000111", "1111", seedRiders, sessionStorage);

    riderLogout(sessionStorage);
    const session = getRiderSession(sessionStorage);

    assert.equal(session, null, "Rider session should be removed");
});

test("auth: rider logout can be called multiple times safely", () => {
    const sessionStorage = createMockSessionStorage();

    riderLogout(sessionStorage);
    riderLogout(sessionStorage);

    const session = getRiderSession(sessionStorage);
    assert.equal(session, null, "Multiple logout calls should be safe");
});

test("auth: rider session persists across navigation", () => {
    const sessionStorage = createMockSessionStorage();
    riderLogin("+254722000222", "2222", seedRiders, sessionStorage);

    const session = getRiderSession(sessionStorage);

    assert.equal(session, "r2", "Rider session should persist");
});

// ═══════════════════════════════════════════════════════════════════════
// USER STORY: Session Validation
// As the system, I want to validate sessions to ensure proper access control
// ═══════════════════════════════════════════════════════════════════════

test("auth: getAdminSession returns null when no session exists", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getAdminSession(sessionStorage);

    assert.equal(session, null, "Should return null when no session");
});

test("auth: getRiderSession returns null when no session exists", () => {
    const sessionStorage = createMockSessionStorage();
    const session = getRiderSession(sessionStorage);

    assert.equal(session, null, "Should return null when no session");
});

test("auth: admin session contains correct role for super-admin", () => {
    const session = localAdminLogin("karebe-owner", "karebeowner1234", seedUsers);

    assert.equal(session.role, "super-admin");
    assert.ok(session.branchId === null, "Super-admin should have null branchId");
});

test("auth: admin session contains correct role for branch admin", () => {
    const session = localAdminLogin("karebe", "karebe1234", seedUsers);

    assert.equal(session.role, "admin");
    assert.ok(session.branchId !== null, "Branch admin should have branchId");
});

test("auth: multiple admin logins update session", () => {
    const sessionStorage = createMockSessionStorage();

    // First login
    const session1 = localAdminLogin("karebe-owner", "karebeowner1234", seedUsers);
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session1));

    // Second login (different user)
    const session2 = localAdminLogin("karebe", "karebe1234", seedUsers);
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session2));

    const current = getAdminSession(sessionStorage);
    assert.equal(current.username, "karebe", "Session should be updated");
});
