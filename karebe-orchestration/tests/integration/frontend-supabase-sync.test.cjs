const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..", "..");
const SEED_SCRIPT = fs.readFileSync(path.join(ROOT, "data", "seed.js"), "utf8");
const APP_SCRIPT = fs.readFileSync(path.join(ROOT, "assets", "app.js"), "utf8");

function createStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    }
  };
}

function createSupabaseMock({ remoteState, upsertError = null }) {
  const calls = {
    upserts: []
  };
  const client = {
    from(table) {
      assert.equal(table, "app_state");
      return {
        select(column) {
          assert.equal(column, "state");
          return {
            eq(idColumn, idValue) {
              assert.equal(idColumn, "id");
              assert.equal(idValue, "karebe_mvp_state");
              return {
                async single() {
                  return { data: remoteState ? { state: remoteState } : null, error: null };
                }
              };
            }
          };
        },
        async upsert(payload) {
          calls.upserts.push(payload);
          return { error: upsertError };
        }
      };
    }
  };
  return { client, calls };
}

function createContext(supabaseClient) {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  const window = {
    __KAREBE_ENABLE_TEST_API__: true,
    supabaseClient
  };
  const context = {
    window,
    localStorage,
    sessionStorage,
    document: {
      body: { dataset: {} },
      getElementById() {
        return null;
      },
      querySelectorAll() {
        return [];
      }
    },
    location: { reload() {} },
    fetch: async () => ({ ok: false, async json() { return {}; } }),
    console,
    setTimeout,
    clearTimeout,
    Promise,
    JSON,
    Date,
    Math,
    alert() {}
  };
  context.window.window = context.window;
  context.window.localStorage = localStorage;
  context.window.sessionStorage = sessionStorage;
  context.window.document = context.document;
  context.window.location = context.location;
  context.window.fetch = context.fetch;
  context.window.console = console;
  context.window.setTimeout = setTimeout;
  context.window.clearTimeout = clearTimeout;
  context.window.alert = context.alert;
  return context;
}

async function bootApp({ remoteState }) {
  const { client, calls } = createSupabaseMock({ remoteState });
  const context = createContext(client);
  vm.createContext(context);
  vm.runInContext(SEED_SCRIPT, context);
  vm.runInContext(APP_SCRIPT, context);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { context, calls };
}

for (let i = 1; i <= 50; i += 1) {
  test(`integration load sync case #${i}`, async () => {
    const remoteCategory = `Remote Category ${i}`;
    const remoteProductId = `p_remote_${i}`;
    const remote = {
      products: [
        {
          id: remoteProductId,
          name: `Remote Product ${i}`,
          category: remoteCategory,
          variants: [{ id: `v_remote_${i}`, volume: "500ml", price: 1000 + i, stock: i }]
        }
      ]
    };
    const { context } = await bootApp({ remoteState: remote });

    const raw = context.localStorage.getItem("karebe_state_v1");
    assert.ok(raw, "expected app state in localStorage");
    const state = JSON.parse(raw);

    assert.ok(Array.isArray(state.users) && state.users.length > 0, "seed fallback should fill users");
    assert.ok(
      state.products.some((product) => product.id === remoteProductId),
      "remote product should exist in merged state"
    );
    assert.ok(
      state.categories.includes(remoteCategory),
      "remote product category should be reconciled into categories"
    );
  });
}

for (let i = 51; i <= 100; i += 1) {
  test(`integration push sync case #${i}`, async () => {
    const { context, calls } = await bootApp({ remoteState: null });
    const testApi = context.window.__KAREBE_TEST_API;
    assert.ok(testApi && typeof testApi.saveState === "function", "test API should expose saveState");

    const nextState = {
      marker: `frontend->supabase-${i}`,
      counter: i,
      nested: { ok: true }
    };
    const result = await testApi.saveState(nextState, `integration_test_${i}`);
    assert.equal(result.ok, true);
    assert.equal(result.localOnly, false);

    const savedLocal = JSON.parse(context.localStorage.getItem("karebe_state_v1"));
    assert.deepEqual(savedLocal, nextState, "localStorage should persist the same state payload");

    assert.equal(calls.upserts.length, 1, "expected one upsert call");
    const payload = JSON.parse(JSON.stringify(calls.upserts[0]));
    assert.deepEqual(payload, {
      id: "karebe_mvp_state",
      state: nextState
    });
  });
}
