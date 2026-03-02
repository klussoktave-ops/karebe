/**
 * assets/realtime.js — Karebe Supabase Realtime Subscriptions
 * Loaded after supabase.js on every page.
 * Registers per-role channel subscriptions and calls
 * window.__KAREBE_RT_HANDLER[eventType]() hooks
 * that app.js registers for each page.
 */
(function () {
    "use strict";

    const LOG = "[KAREBE:RT]";

    // ── Wait for supabaseClient to be ready ───────────────────────
    function waitForClient(cb, retries) {
        retries = retries === undefined ? 20 : retries;
        if (window.supabaseClient) return cb(window.supabaseClient);
        if (retries <= 0) {
            console.warn(LOG, "supabaseClient not available — realtime disabled.");
            return;
        }
        setTimeout(function () { waitForClient(cb, retries - 1); }, 150);
    }

    // ── Handler registry ─────────────────────────────────────────
    // app.js registers handlers like:
    //   window.__KAREBE_RT_HANDLER = { cart_total_updated: fn, order_created: fn, ... }
    function dispatch(eventType, payload) {
        var handlers = window.__KAREBE_RT_HANDLER;
        console.info(LOG, "event:", eventType, payload);
        if (handlers && typeof handlers[eventType] === "function") {
            handlers[eventType](payload);
        }
    }

    // ── Determine role from session ───────────────────────────────
    function getRole() {
        try {
            var adminSession = JSON.parse(sessionStorage.getItem("karebe_admin_session") || "null");
            if (adminSession && adminSession.role) return adminSession.role;
            var riderId = sessionStorage.getItem("karebe_rider_id");
            if (riderId) return "rider";
        } catch (_) { }
        return "customer";
    }

    function getUserId() {
        try {
            var adminSession = JSON.parse(sessionStorage.getItem("karebe_admin_session") || "null");
            if (adminSession && adminSession.id) return adminSession.id;
            var riderId = sessionStorage.getItem("karebe_rider_id");
            if (riderId) return riderId;
            // Customer: from active profile stored in localStorage state
            var raw = localStorage.getItem("karebe_state_v1");
            if (raw) {
                var state = JSON.parse(raw);
                return state.activeCustomerProfileId || null;
            }
        } catch (_) { }
        return null;
    }

    // ── Notification channel (shared) ────────────────────────────
    // All roles subscribe to their own notifications via the notifications table.
    // RLS ensures each user/role only sees their own rows.
    function subscribeNotifications(client, userId, role) {
        var filter = userId
            ? "user_id=eq." + userId
            : "role=eq." + role;

        var channel = client
            .channel("karebe-notifications-" + (userId || role))
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "notifications", filter: filter },
                function (payload) {
                    var notif = payload.new;
                    dispatch(notif.type, notif);
                }
            )
            .subscribe(function (status) {
                console.info(LOG, "notifications channel:", status);
            });

        return channel;
    }

    // ── Admin: orders + delivery_assignments channels ─────────────
    function subscribeAdmin(client) {
        // New orders
        client
            .channel("karebe-admin-orders")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "orders" },
                function (payload) {
                    dispatch("order_changed", payload);
                }
            )
            .subscribe();

        // Delivery updates
        client
            .channel("karebe-admin-delivery")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "delivery_assignments" },
                function (payload) {
                    dispatch("delivery_changed", payload);
                }
            )
            .subscribe();

        // Product additions
        client
            .channel("karebe-admin-products")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "products" },
                function (payload) {
                    dispatch("product_added", payload.new);
                }
            )
            .subscribe();

        console.info(LOG, "Admin channels subscribed.");
    }

    // ── Rider: own delivery_assignments channel ───────────────────
    function subscribeRider(client, riderId) {
        client
            .channel("karebe-rider-" + riderId)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "delivery_assignments",
                    filter: "rider_id=eq." + riderId,
                },
                function (payload) {
                    dispatch("delivery_changed", payload);
                }
            )
            .subscribe(function (status) {
                console.info(LOG, "Rider delivery channel:", status);
            });
    }

    // ── Bootstrap ────────────────────────────────────────────────
    waitForClient(function (client) {
        var role = getRole();
        var userId = getUserId();

        console.info(LOG, "Initializing realtime. Role:", role, "UserId:", userId);

        // All roles: subscribe to their notification rows
        subscribeNotifications(client, userId, role);

        if (role === "admin" || role === "super-admin") {
            subscribeAdmin(client);
        } else if (role === "rider") {
            subscribeRider(client, userId);
        }
        // customer role uses notification channel only (no direct table streams)
    });

    // ── Toast helper for realtime events ─────────────────────────
    // Registers default handlers for common notification types.
    // These can be overridden per-page by setting window.__KAREBE_RT_HANDLER before this script runs.
    window.addEventListener("DOMContentLoaded", function () {
        var defaults = {
            cart_total_updated: function (n) {
                if (window.__KAREBE_NOTIFY) window.__KAREBE_NOTIFY(n.message, "info");
            },
            order_created: function (n) {
                if (window.__KAREBE_NOTIFY) window.__KAREBE_NOTIFY(n.message || "New order received!", "success");
            },
            order_status_updated: function (n) {
                if (window.__KAREBE_NOTIFY) window.__KAREBE_NOTIFY(n.message, "info");
            },
            delivery_assigned: function (n) {
                if (window.__KAREBE_NOTIFY) window.__KAREBE_NOTIFY(n.message, "info");
            },
            delivery_status_updated: function (n) {
                if (window.__KAREBE_NOTIFY) window.__KAREBE_NOTIFY(n.message, "info");
            },
            stock_low: function (n) {
                if (window.__KAREBE_NOTIFY) window.__KAREBE_NOTIFY(n.message, "warning");
            },
            product_added: function (n) {
                if (window.__KAREBE_NOTIFY) window.__KAREBE_NOTIFY(n.message || "New product added!", "success");
            },
            order_changed: function (n) {
                // Admin: re-render orders list
                if (window.__KAREBE_RT_HANDLER && window.__KAREBE_RT_HANDLER.order_changed) return; // already overridden
                if (window.__KAREBE_NOTIFY) window.__KAREBE_NOTIFY("Order list updated.", "info");
            },
            delivery_changed: function (n) {
                if (window.__KAREBE_NOTIFY) window.__KAREBE_NOTIFY("Delivery status updated.", "info");
            },
        };

        // Only install defaults for types not already registered
        window.__KAREBE_RT_HANDLER = window.__KAREBE_RT_HANDLER || {};
        Object.keys(defaults).forEach(function (key) {
            if (!window.__KAREBE_RT_HANDLER[key]) {
                window.__KAREBE_RT_HANDLER[key] = defaults[key];
            }
        });
    });
})();
