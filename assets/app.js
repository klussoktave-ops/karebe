(function () {
  const STORAGE_KEY = "karebe_state_v1";
  const ADMIN_SESSION_KEY = "karebe_admin_session";
  const ADMIN_CATALOG_SELECTION_KEY = "karebe_admin_catalog_selection";
  const ADMIN_ORDER_EXPANDED_KEY = "karebe_admin_expanded_order";
  const CUSTOMER_CHECKOUT_METHOD_KEY = "karebe_customer_checkout_method";
  const RIDER_SESSION_KEY = "karebe_rider_id";
  const CUSTOMER_BRANCH_KEY = "karebe_customer_branch";
  const PAYMENT_STATUSES = ["PENDING", "PAID"];
  const DELIVERY_STATUSES = ["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED"];

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function fmtKES(n) {
    return `KES ${Number(n || 0).toLocaleString()}`;
  }

  function summarizeItems(items, limit) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return "-";
    const cap = Number(limit || 2);
    const rendered = list.map((item) => `${item.productName} x${item.qty}`);
    const shown = rendered.slice(0, cap).join(", ");
    if (rendered.length <= cap) return shown;
    return `${shown} +${rendered.length - cap} more`;
  }

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function dateOnly(s) {
    return new Date(s).toISOString().slice(0, 10);
  }

  function inRangeDays(dateStr, days) {
    const t = new Date(dateStr).getTime();
    const from = Date.now() - days * 86400000;
    return t >= from;
  }

  function toWhatsAppPhone(phone) {
    return String(phone || "").replace(/[^\d]/g, "");
  }

  function refreshResponsiveTables(scope) {
    const root = scope || document;
    root.querySelectorAll(".table-wrap table").forEach((table) => {
      const headers = Array.from(table.querySelectorAll("thead th")).map((th) => String(th.textContent || "").trim());
      if (!headers.length) return;
      table.querySelectorAll("tbody tr").forEach((tr) => {
        Array.from(tr.children).forEach((cell, idx) => {
          if (cell && cell.setAttribute) cell.setAttribute("data-label", headers[idx] || "Value");
        });
      });
    });
  }

  function reconcile(state, seed) {
    const next = clone(state || {});
    next.users = Array.isArray(next.users) ? next.users : clone(seed.users || []);
    next.branches = Array.isArray(next.branches) ? next.branches : clone(seed.branches || []);
    const stateCategories = Array.isArray(next.categories) ? next.categories : [];
    const seedCategories = Array.isArray(seed.categories) ? seed.categories : [];
    const legacyTaxonomyCategories =
      next.taxonomies && Array.isArray(next.taxonomies.categories) ? next.taxonomies.categories : [];
    next.categories = [];
    [...stateCategories, ...seedCategories, ...legacyTaxonomyCategories].forEach((c) => {
      const value = String(c || "").trim();
      if (value && !next.categories.includes(value)) next.categories.push(value);
    });
    next.products = Array.isArray(next.products) ? next.products : clone(seed.products || []);
    (seed.products || []).forEach((p) => {
      if (!next.products.find((x) => x.id === p.id)) next.products.push(clone(p));
    });
    next.products.forEach((p) => {
      const category = String((p && p.category) || "").trim();
      if (category && !next.categories.includes(category)) next.categories.push(category);
    });
    next.riders = Array.isArray(next.riders) ? next.riders : clone(seed.riders || []);
    next.orders = Array.isArray(next.orders) ? next.orders : [];
    next.deliveries = Array.isArray(next.deliveries) ? next.deliveries : [];
    next.cart = Array.isArray(next.cart) ? next.cart : [];
    next.tills = Array.isArray(next.tills) ? next.tills : clone(seed.tills || []);
    next.paymentInfrastructure =
      next.paymentInfrastructure && typeof next.paymentInfrastructure === "object"
        ? next.paymentInfrastructure
        : clone(seed.paymentInfrastructure || {});
    next.customerProfiles = Array.isArray(next.customerProfiles) ? next.customerProfiles : clone(seed.customerProfiles || []);
    next.customerProfiles.forEach((cp) => {
      cp.cart = Array.isArray(cp.cart) ? cp.cart : [];
      cp.orderIds = Array.isArray(cp.orderIds) ? cp.orderIds : [];
    });
    if (!next.customerProfiles.length) {
      next.customerProfiles.push({
        id: "cst_default",
        fullName: "Walk-in Customer",
        phone: "+254700000000",
        email: "",
        defaultBranchId: next.branches[0] ? next.branches[0].id : null,
        cart: clone(next.cart),
        orderIds: []
      });
    }
    next.activeCustomerProfileId =
      next.activeCustomerProfileId && next.customerProfiles.find((cp) => cp.id === next.activeCustomerProfileId)
        ? next.activeCustomerProfileId
        : next.customerProfiles[0].id;
    return next;
  }

  function loadState() {
    const seed = clone(window.KAREBE_SEED || {});
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = reconcile(seed, seed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw);
    const merged = reconcile(parsed, seed);
    if (JSON.stringify(parsed) !== JSON.stringify(merged)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  }

  function logClient(level, scope, message, payload) {
    const tag = `[KAREBE:${scope}] ${message}`;
    if (payload !== undefined) {
      (console[level] || console.log)(tag, payload);
    } else {
      (console[level] || console.log)(tag);
    }
  }

  function ensureToastRoot() {
    let root = document.getElementById("toastRoot");
    if (root) return root;
    root = document.createElement("div");
    root.id = "toastRoot";
    root.className = "toast-root";
    document.body.appendChild(root);
    return root;
  }

  function notify(message, type) {
    const root = ensureToastRoot();
    const toast = document.createElement("div");
    toast.className = `toast ${type || ""}`.trim();
    toast.textContent = message;
    root.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 180);
    }, 2600);
  }

  function adminSyncLabel(type, message) {
    const el = document.getElementById("adminSyncStatus");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("ok", "warn", "danger");
    if (type) el.classList.add(type);
  }

  async function saveState(state, source) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const ctx = source || "state_update";
    if (!window.supabaseClient) {
      logClient("warn", "SYNC", "Supabase client unavailable, persisted locally only.", { source: ctx });
      return { ok: false, localOnly: true, error: new Error("Supabase client unavailable") };
    }
    logClient("info", "SYNC", "Push started.", { source: ctx });
    try {
      const { error } = await window.supabaseClient.from("app_state").upsert({ id: "karebe_mvp_state", state });
      if (error) {
        logClient("error", "SYNC", "Push failed.", { source: ctx, error });
        return { ok: false, localOnly: false, error };
      }
      logClient("info", "SYNC", "Push success.", { source: ctx });
      return { ok: true, localOnly: false, error: null };
    } catch (error) {
      logClient("error", "SYNC", "Push failed (exception).", { source: ctx, error });
      return { ok: false, localOnly: false, error };
    }
  }

  function getBranch(state, branchId) {
    return state.branches.find((b) => b.id === branchId) || state.branches.find((b) => b.isMain) || state.branches[0];
  }

  function selectedBranchId(state) {
    const raw = localStorage.getItem(CUSTOMER_BRANCH_KEY);
    if (raw && state.branches.find((b) => b.id === raw)) return raw;
    const b = getBranch(state);
    if (b) localStorage.setItem(CUSTOMER_BRANCH_KEY, b.id);
    return b ? b.id : "";
  }

  function getShiftContact(state, branchId) {
    const branch = getBranch(state, branchId);
    const user = state.users.find((u) => u.id === (branch ? branch.onShiftUserId : null) && u.active);
    const phone = (user && user.phone) || (branch && branch.phone) || (state.business && state.business.phone) || "";
    return {
      branch,
      user,
      phone,
      whatsappPhone: toWhatsAppPhone(phone),
      label: user ? `${user.name} (${user.role})` : "Front Desk"
    };
  }

  function buildMessage(state, contact, items) {
    const total = items.reduce((s, i) => s + i.lineTotal, 0);
    const lines = [`Hi ${state.business.name},`, `Branch: ${contact.branch.location}`, `On shift: ${contact.label}`, "Order request:"];
    items.forEach((i, idx) => lines.push(`${idx + 1}. ${i.productName} (${i.volume}) x${i.qty} = ${fmtKES(i.lineTotal)}`));
    lines.push(`Total: ${fmtKES(total)}`);
    return lines.join("\n");
  }

  function makeItem(product, variant, qty, branchId) {
    return {
      id: uid("c"),
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      volume: variant.volume,
      qty,
      unitPrice: variant.price,
      lineTotal: qty * variant.price,
      maxStock: Number(variant.stock || 0),
      branchId
    };
  }

  function getActiveCustomerProfile(state) {
    return state.customerProfiles.find((cp) => cp.id === state.activeCustomerProfileId) || state.customerProfiles[0];
  }

  function getTillForBranch(state, branchId) {
    return (state.tills || []).find((t) => t.branchId === branchId && t.active) || null;
  }

  function createMockDarajaRequest(state, customerProfile, till, amount) {
    return {
      provider: "safaricom-daraja",
      merchantRequestId: `mreq_${Math.random().toString(36).slice(2, 10)}`,
      checkoutRequestId: `creq_${Math.random().toString(36).slice(2, 10)}`,
      tillId: till ? till.id : null,
      tillNumber: till ? till.tillNumber : null,
      businessShortCode: till ? till.businessShortCode : null,
      accountReference: till ? till.accountReference : "KAREBE",
      amount,
      msisdn: customerProfile.phone,
      status: "PENDING",
      createdAt: nowISO()
    };
  }

  async function backendAdminLogin(username, password) {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) return null;
      const body = await res.json();
      return body && body.ok ? body.admin : null;
    } catch (_) {
      return null;
    }
  }

  function renderCustomer() {
    const state = loadState();
    const adminSession = getAdminSession();
    const riderSession = getRiderSession();

    // Show/hide admin and rider links based on authentication
    document.querySelectorAll('.auth-only').forEach(el => {
      el.style.display = (adminSession || riderSession) ? 'inline' : 'none';
    });
    const categorySel = document.getElementById("categoryFilter");
    const popularSel = document.getElementById("popularFilter");
    const newSel = document.getElementById("newFilter");
    const maxPrice = document.getElementById("maxPrice");
    const branchSel = document.getElementById("branchSelect");
    const customerSel = document.getElementById("customerProfileSelect");
    const shiftContact = document.getElementById("shiftContact");
    const list = document.getElementById("products");
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");
    const cartPrimaryAction = document.getElementById("cartPrimaryAction") || document.getElementById("cartCheckout");
    const checkoutMethods = document.getElementById("checkoutMethods");
    const checkoutHint = document.getElementById("checkoutHint");
    const cartClear = document.getElementById("cartClear");
    const cartCountBadge = document.getElementById("cartCountBadge");
    const activeTill = document.getElementById("activeTill");
    const customerMeta = document.getElementById("customerMeta");
    const selectableOrders = document.getElementById("selectableOrders");
    const checkoutMethodMeta = {
      MPESA_DARAJA: {
        cta: "Checkout With M-Pesa (Mock)",
        hint: "Fastest route: create an order instantly and submit a mock M-Pesa payment request."
      },
      CALL: {
        cta: "Call Front Desk",
        hint: "Best for special requests. You can confirm details directly with the branch contact."
      },
      SMS: {
        cta: "Send Order By SMS",
        hint: "Send your full cart as an SMS if data connection is limited."
      },
      WHATSAPP: {
        cta: "Send Order On WhatsApp",
        hint: "Open WhatsApp with a prefilled cart message for quick confirmation."
      }
    };
    let selectedCheckoutMethod = sessionStorage.getItem(CUSTOMER_CHECKOUT_METHOD_KEY) || "MPESA_DARAJA";
    if (!checkoutMethodMeta[selectedCheckoutMethod]) selectedCheckoutMethod = "MPESA_DARAJA";

    const categories = state.categories || [];
    categorySel.innerHTML = `<option value="">All Categories</option>${categories.map((c) => `<option value="${c}">${c}</option>`).join("")}`;
    if (branchSel) {
      branchSel.innerHTML = state.branches.map((b) => `<option value="${b.id}">${b.location || b.name}</option>`).join("");
      branchSel.value = selectedBranchId(state);
    }
    if (customerSel) {
      customerSel.innerHTML = state.customerProfiles
        .map((cp) => `<option value="${cp.id}">${cp.fullName} (${cp.phone})</option>`)
        .join("");
      customerSel.value = state.activeCustomerProfileId;
    }

    function currentBranchId() {
      return (branchSel && branchSel.value) || selectedBranchId(loadState());
    }

    // Google Maps logic for catalog
    window.initMap = () => {
      const mapEl = document.getElementById("catalogMap");
      if (!mapEl || !window.google) return;

      const map = new google.maps.Map(mapEl, {
        zoom: 11,
        center: { lat: -1.286389, lng: 36.817223 }, // Default Nairobi
        mapTypeId: "roadmap",
        disableDefaultUI: true,
        zoomControl: true
      });
      mapEl.style.display = "block";

      const s = loadState();
      const bounds = new google.maps.LatLngBounds();
      s.branches.forEach(b => {
        if (b.lat && b.lng) {
          const pos = { lat: b.lat, lng: b.lng };
          new google.maps.Marker({ position: pos, map, title: b.name || b.location, label: "B" });
          bounds.extend(pos);
        }
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds);
    };

    const nearestBtn = document.getElementById("findNearestBranchBtn");
    if (nearestBtn) {
      nearestBtn.onclick = () => {
        if (!navigator.geolocation) {
          notify("Geolocation is not supported by your browser.", "warn");
          return;
        }
        if (!window.google) {
          notify("Maps is still loading. Try again in a moment.", "warn");
          return;
        }

        nearestBtn.textContent = "Locating...";
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const clientLoc = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            const fresh = loadState();
            let closestBranch = null;
            let shortestDist = Infinity;

            fresh.branches.forEach(b => {
              if (b.lat && b.lng) {
                const branchLoc = new google.maps.LatLng(b.lat, b.lng);
                const dist = google.maps.geometry.spherical.computeDistanceBetween(clientLoc, branchLoc);
                if (dist < shortestDist) {
                  shortestDist = dist;
                  closestBranch = b;
                }
              }
            });

            if (closestBranch) {
              branchSel.value = closestBranch.id;
              localStorage.setItem(CUSTOMER_BRANCH_KEY, closestBranch.id);
              draw();
              notify(
                `Nearest branch: ${closestBranch.location || closestBranch.name} (${(shortestDist / 1000).toFixed(1)} km away).`,
                "ok"
              );
            } else {
              notify("No branches with exact locations set by admin yet.", "warn");
            }
            nearestBtn.textContent = "Nearest";
            // Save location to profile temporarily for order routing
            const p = currentProfile(fresh);
            p.lastLat = pos.coords.latitude;
            p.lastLng = pos.coords.longitude;
            saveState(fresh);
          },
          (err) => {
            console.error(err);
            notify("Could not get location. Please enable location services and retry.", "warn");
            nearestBtn.textContent = "Nearest";
          },
          { enableHighAccuracy: true }
        );
      };
    }

    function currentProfile(stateRef) {
      return getActiveCustomerProfile(stateRef || loadState());
    }

    function qtyFor(productId, variantId) {
      const el = document.getElementById(`qty_${productId}_${variantId}`);
      return Math.max(1, Number(el ? el.value : 1) || 1);
    }

    function syncLegacyCart(fresh, profile) {
      fresh.cart = profile.cart.slice();
    }

    function syncCheckoutMethodUI(hasItems) {
      if (checkoutMethods) {
        checkoutMethods.querySelectorAll("[data-method]").forEach((btn) => {
          const method = btn.dataset.method;
          btn.classList.toggle("is-active", method === selectedCheckoutMethod);
          btn.disabled = !hasItems;
        });
      }
      if (cartPrimaryAction) {
        const meta = checkoutMethodMeta[selectedCheckoutMethod] || checkoutMethodMeta.MPESA_DARAJA;
        cartPrimaryAction.textContent = hasItems ? meta.cta : "Add Items To Checkout";
        cartPrimaryAction.disabled = !hasItems;
      }
      if (checkoutHint) {
        checkoutHint.textContent = (checkoutMethodMeta[selectedCheckoutMethod] || checkoutMethodMeta.MPESA_DARAJA).hint;
      }
    }

    function setCheckoutMethod(method, hasItems) {
      if (!checkoutMethodMeta[method]) return;
      selectedCheckoutMethod = method;
      sessionStorage.setItem(CUSTOMER_CHECKOUT_METHOD_KEY, selectedCheckoutMethod);
      syncCheckoutMethodUI(hasItems);
    }

    function renderCart() {
      if (!cartItems || !cartTotal) return;
      const fresh = loadState();
      const branchId = currentBranchId();
      const profile = currentProfile(fresh);
      const items = profile.cart.filter((i) => i.branchId === branchId);
      const total = items.reduce((s, i) => s + i.lineTotal, 0);
      const itemCount = items.reduce((sum, i) => sum + Number(i.qty || 0), 0);
      const contact = getShiftContact(fresh, branchId);
      const till = getTillForBranch(fresh, branchId);
      cartItems.innerHTML = items.length
        ? items
          .map(
            (i) =>
              `<div class="cart-row"><span>${i.productName} (${i.volume}) x${i.qty}</span><span>${fmtKES(i.lineTotal)}</span><button class="secondary" data-act="remove" data-id="${i.id}">Remove</button></div>`
          )
          .join("")
        : `<p class="small">Your cart is empty. Add an item from the catalog to start checkout.</p>`;
      cartTotal.textContent = fmtKES(total);
      syncCheckoutMethodUI(items.length > 0);
      if (cartCountBadge) {
        cartCountBadge.textContent = String(itemCount);
        cartCountBadge.classList.remove("bump");
        // Retrigger bump animation after every cart mutation.
        void cartCountBadge.offsetWidth;
        cartCountBadge.classList.add("bump");
      }
      if (shiftContact) shiftContact.textContent = `On shift: ${contact.label} - ${contact.phone}`;
      if (activeTill) {
        activeTill.textContent = till
          ? `Till: ${till.tillNumber} (${till.accountReference})`
          : "No active till configured for this branch.";
      }
      if (customerMeta) {
        customerMeta.textContent = `${profile.fullName} | ${profile.phone} | ${profile.email || "no email"
          }`;
      }

      if (cartPrimaryAction) {
        cartPrimaryAction.onclick = () => {
          if (!items.length) {
            notify("Add items to cart before checkout.", "warn");
            return;
          }
          if (selectedCheckoutMethod === "CALL") {
            window.location.href = `tel:${contact.phone}`;
            return;
          }
          if (selectedCheckoutMethod === "SMS") {
            window.location.href = `sms:${contact.phone}?body=${encodeURIComponent(buildMessage(fresh, contact, items))}`;
            return;
          }
          if (selectedCheckoutMethod === "WHATSAPP") {
            window.open(`https://wa.me/${contact.whatsappPhone}?text=${encodeURIComponent(buildMessage(fresh, contact, items))}`, "_blank", "noopener");
            return;
          }

          const s = loadState();
          const p = currentProfile(s);
          const tillRef = getTillForBranch(s, branchId);
          if (!tillRef) {
            notify("No active till configured for this branch.", "warn");
            return;
          }
          const outOfStockItem = items.find((item) => {
            const prod = s.products.find((pdt) => pdt.id === item.productId);
            const variant = prod && prod.variants.find((vr) => vr.id === item.variantId);
            return !variant || variant.stock < item.qty;
          });
          if (outOfStockItem) {
            notify(`Insufficient stock for ${outOfStockItem.productName}. Refresh your cart and try again.`, "warn");
            return;
          }
          const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);
          const request = createMockDarajaRequest(s, p, tillRef, totalAmount);
          const order = {
            id: uid("o"),
            customerProfileId: p.id,
            customerPhone: p.phone,
            source: "CART",
            paymentStatus: "PENDING",
            paymentMethod: "MPESA_DARAJA",
            paymentRequest: request,
            status: "CONFIRMED",
            total: totalAmount,
            createdAt: nowISO(),
            createdBy: "customer",
            branchId,
            customerLat: p.lastLat || null,
            customerLng: p.lastLng || null,
            items: items.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              variantId: i.variantId,
              volume: i.volume,
              qty: i.qty,
              unitPrice: i.unitPrice,
              lineTotal: i.lineTotal
            }))
          };
          items.forEach((item) => {
            const prod = s.products.find((pdt) => pdt.id === item.productId);
            const variant = prod && prod.variants.find((vr) => vr.id === item.variantId);
            if (variant) variant.stock -= item.qty;
          });
          s.orders.push(order);
          p.orderIds.push(order.id);
          p.cart = p.cart.filter((i) => i.branchId !== branchId);
          syncLegacyCart(s, p);
          saveState(s);
          notify(`Checkout created. Request ID: ${request.checkoutRequestId}`, "ok");
          renderCart();
          renderSelectableOrders();
        };
      }
      if (cartClear) cartClear.onclick = () => {
        if (!items.length) {
          notify("Cart is already empty for this branch.", "warn");
          return;
        }
        const s = loadState();
        const p = currentProfile(s);
        p.cart = p.cart.filter((i) => i.branchId !== branchId);
        syncLegacyCart(s, p);
        saveState(s);
        renderCart();
        notify("Cart cleared.", "ok");
      };
    }

    function renderSelectableOrders() {
      if (!selectableOrders) return;
      const fresh = loadState();
      const profile = currentProfile(fresh);
      const orders = fresh.orders.filter((o) => o.customerProfileId === profile.id);
      selectableOrders.innerHTML = orders.length
        ? orders
          .map(
            (o) =>
              `<article class="card customer-order-card"><div class="card-body"><div class="row"><strong>${o.id}</strong><span class="badge ${o.paymentStatus === "PAID" ? "ok" : "warn"}">${o.paymentMethod || "N/A"}</span></div><p class="small">${dateOnly(
                o.createdAt
              )} | ${o.paymentStatus} | ${fmtKES(o.total)}</p><p class="small">Items: ${o.items
                .map((it) => `${it.productName} x${it.qty}`)
                .join(", ")}</p></div></article>`
          )
          .join("")
        : `<p class="small">No orders yet. Add products to cart and checkout to create your first order.</p>`;
    }

    function addItemToProfileCart(item) {
      const fresh = loadState();
      const profile = currentProfile(fresh);
      const existing = profile.cart.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId && i.branchId === item.branchId
      );
      if (existing) {
        if (existing.qty + item.qty > item.maxStock) {
          notify("Cannot add beyond available stock.", "warn");
          return;
        }
        existing.qty += item.qty;
        existing.lineTotal = existing.qty * existing.unitPrice;
      } else {
        if (item.qty > item.maxStock) {
          notify("Requested quantity exceeds available stock.", "warn");
          return;
        }
        profile.cart.push({ ...item });
      }
      syncLegacyCart(fresh, profile);
      saveState(fresh);
      renderCart();
      notify("Added to cart.", "ok");
    }

    function card(product, variant) {
      const inStock = variant.stock > 0;
      return `
      <article class="card product-card">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <div class="card-body">
          <div class="row"><strong>${product.name}</strong><span class="badge ${inStock ? "ok" : "danger"}">${inStock ? "In Stock" : "Out"}</span></div>
          <p class="small">${product.description}</p>
          <div class="row"><span class="badge">${product.category}</span><span class="badge gold">${variant.volume}</span></div>
          <div class="row qty-row"><strong>${fmtKES(variant.price)}</strong><div class="qty-wrap"><label class="small qty-label" for="qty_${product.id}_${variant.id}">Qty</label><input class="qty-input" id="qty_${product.id}_${variant.id}" type="number" min="1" value="1" /></div></div>
          <div class="actions"><button data-act="cart" data-pid="${product.id}" data-vid="${variant.id}" ${!inStock ? "disabled" : ""}>Add To Cart</button></div>
          <p class="small">Stock available: ${variant.stock} units.</p>
        </div>
      </article>`;
    }

    function draw() {
      const fresh = loadState();
      const cards = [];
      fresh.products.forEach((p) => {
        if (categorySel.value && p.category !== categorySel.value) return;
        if (popularSel.value === "yes" && !p.popular) return;
        if (newSel.value === "yes" && !p.newArrival) return;
        (p.variants || []).forEach((v) => {
          if (v.price > Number(maxPrice.value || 999999)) return;
          cards.push(card(p, v));
        });
      });
      list.innerHTML = cards.length ? cards.join("") : `<p class="small">No products match these filters. Broaden filters to continue.</p>`;
      renderCart();
    }

    list.onclick = (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const fresh = loadState();
      const branchId = currentBranchId();
      const p = fresh.products.find((x) => x.id === btn.dataset.pid);
      const v = p && p.variants.find((x) => x.id === btn.dataset.vid);
      if (!p || !v) return;
      const qty = qtyFor(p.id, v.id);
      if (qty > v.stock) {
        notify("Requested quantity is higher than available stock.", "warn");
        return;
      }
      const item = makeItem(p, v, qty, branchId);
      if (btn.dataset.act === "cart") addItemToProfileCart(item);
    };

    if (checkoutMethods) {
      checkoutMethods.onclick = (e) => {
        const button = e.target.closest("[data-method]");
        if (!button) return;
        const fresh = loadState();
        const branchId = currentBranchId();
        const profile = currentProfile(fresh);
        const hasItems = profile.cart.some((i) => i.branchId === branchId);
        setCheckoutMethod(button.dataset.method, hasItems);
      };
    }

    if (cartItems) {
      cartItems.onclick = (e) => {
        const btn = e.target.closest("button[data-act='remove']");
        if (!btn) return;
        const s = loadState();
        const p = currentProfile(s);
        p.cart = p.cart.filter((i) => i.id !== btn.dataset.id);
        syncLegacyCart(s, p);
        saveState(s);
        renderCart();
        notify("Item removed from cart.", "ok");
      };
    }

    [categorySel, popularSel, newSel, maxPrice].forEach((el) => el.addEventListener("change", draw));
    if (branchSel) branchSel.addEventListener("change", () => { localStorage.setItem(CUSTOMER_BRANCH_KEY, branchSel.value); draw(); });
    if (customerSel) {
      customerSel.addEventListener("change", () => {
        const s = loadState();
        s.activeCustomerProfileId = customerSel.value;
        saveState(s);
        draw();
        renderSelectableOrders();
      });
    }
    draw();
    renderSelectableOrders();
    refreshResponsiveTables();
  }

  function getAllVariants(state) {
    const rows = [];
    state.products.forEach((p) => (p.variants || []).forEach((v) => rows.push({ product: p, variant: v })));
    return rows;
  }

  function getAdminSession() {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function localAdminLogin(username, password, state) {
    const user = state.users.find((u) => u.username === username && u.password === password && u.active);
    if (!user) return null;
    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      branchId: user.branchId || null
    };
  }

  function renderAdmin() {
    const state = loadState();
    const loginWrap = document.getElementById("adminLogin");
    const appWrap = document.getElementById("adminApp");
    const navWrap = document.getElementById("adminNav");
    const session = getAdminSession();

    if (!session) {
      loginWrap.classList.remove("hidden");
      appWrap.classList.add("hidden");
      if (navWrap) navWrap.classList.add("hidden");
      document.getElementById("adminLoginForm").onsubmit = async (e) => {
        e.preventDefault();
        const u = document.getElementById("adminUser").value.trim();
        const p = document.getElementById("adminPass").value;
        const latest = loadState();
        const backendSession = await backendAdminLogin(u, p);
        const localSession = localAdminLogin(u, p, latest);
        const finalSession = backendSession || localSession;
        if (finalSession) {
          sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(finalSession));
          renderAdmin();
        } else {
          notify("Invalid credentials.", "danger");
        }
      };
      return;
    }

    loginWrap.classList.add("hidden");
    appWrap.classList.remove("hidden");
    if (navWrap) navWrap.classList.remove("hidden");
    const isSuper = session.role === "super-admin";
    adminSyncLabel("ok", "Sync ready");
    const identity = document.getElementById("adminIdentity");
    if (identity) identity.textContent = `${session.name || session.username} (${session.role})`;
    document.querySelectorAll(".super-only").forEach((el) => el.classList.toggle("hidden", !isSuper));

    document.getElementById("adminLogout").onclick = () => {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      renderAdmin();
    };

    async function persistAdminState(fresh, actionName, options) {
      const opts = options || {};
      const rerender = opts.rerender !== false;
      const onSuccess = typeof opts.onSuccess === "function" ? opts.onSuccess : null;
      adminSyncLabel("warn", `Syncing ${actionName}...`);
      const result = await saveState(fresh, `admin:${actionName}`);
      if (!result.ok) {
        const reason = result.error && result.error.message ? result.error.message : "Unknown sync failure";
        adminSyncLabel("danger", `Sync failed: ${actionName}`);
        notify(`Saved locally, but sync failed for "${actionName}".`, "warn");
        logClient("error", "ADMIN", `Action failed remote sync: ${actionName}`, { reason });
        return false;
      }
      adminSyncLabel("ok", `Synced: ${actionName}`);
      logClient("info", "ADMIN", `Action synced: ${actionName}`);
      notify(`Saved: ${actionName.replaceAll("_", " ")}.`, "ok");
      if (onSuccess) onSuccess();
      if (rerender) renderAdmin();
      return true;
    }

    // Google Maps Admin Logic
    window.initMap = () => {
      const mapEl = document.getElementById("adminBranchMap");
      if (!mapEl || !window.google) return;
      const map = new google.maps.Map(mapEl, {
        zoom: 12,
        center: { lat: -1.286389, lng: 36.817223 },
        mapTypeId: "roadmap"
      });
      let marker = null;
      map.addListener("click", (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        document.getElementById("newBranchLat").value = lat;
        document.getElementById("newBranchLng").value = lng;
        if (!marker) marker = new google.maps.Marker({ map });
        marker.setPosition(e.latLng);
      });
    };

    const newBranchForm = document.getElementById("newBranchForm");
    if (newBranchForm) {
      newBranchForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!isSuper) {
          notify("Only super-admin can create branches.", "warn");
          return;
        }
        const fresh = loadState();
        fresh.branches.push({
          id: uid("b"),
          name: document.getElementById("newBranchName").value.trim(),
          isMain: false,
          location: document.getElementById("newBranchName").value.trim(),
          phone: document.getElementById("newBranchPhone").value.trim(),
          lat: Number(document.getElementById("newBranchLat").value),
          lng: Number(document.getElementById("newBranchLng").value),
          onShiftUserId: null
        });
        await persistAdminState(fresh, "create_branch");
      };
    }

    const variants = getAllVariants(state);
    const kpiTodayEl = document.getElementById("kpiToday");
    const kpiWeekEl = document.getElementById("kpiWeek");
    const kpiMonthEl = document.getElementById("kpiMonth");
    const kpiActiveEl = document.getElementById("kpiActive");
    if (kpiTodayEl) {
      kpiTodayEl.textContent = fmtKES(
        state.orders.filter((o) => dateOnly(o.createdAt) === dateOnly(nowISO())).reduce((s, o) => s + o.total, 0)
      );
    }
    if (kpiWeekEl) {
      kpiWeekEl.textContent = fmtKES(
        state.orders.filter((o) => inRangeDays(o.createdAt, 7)).reduce((s, o) => s + o.total, 0)
      );
    }
    if (kpiMonthEl) {
      kpiMonthEl.textContent = fmtKES(
        state.orders.filter((o) => inRangeDays(o.createdAt, 30)).reduce((s, o) => s + o.total, 0)
      );
    }
    if (kpiActiveEl) {
      kpiActiveEl.textContent = String(
        state.deliveries.filter((d) => d.status !== "DELIVERED").length
      );
    }

    const freq = {};
    state.orders.forEach((o) => o.items.forEach((i) => (freq[i.productName] = (freq[i.productName] || 0) + i.qty)));
    const topProductsEl = document.getElementById("topProducts");
    if (topProductsEl) {
      topProductsEl.textContent =
        Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, qty]) => `${name} (${qty})`)
          .join(", ") || "No orders yet";
    }

    const riderPerformanceEl = document.getElementById("riderPerformance");
    if (riderPerformanceEl) {
      riderPerformanceEl.textContent =
        state.riders
          .map((r) => `${r.name}: ${state.deliveries.filter((d) => d.riderId === r.id && d.status === "DELIVERED").length}`)
          .join(" | ") || "No rider data";
    }

    const customerProfilesBody = document.getElementById("customerProfilesBody");
    if (customerProfilesBody) {
      customerProfilesBody.innerHTML =
        state.customerProfiles
          .map((cp) => {
            const branch = state.branches.find((b) => b.id === cp.defaultBranchId);
            return `<tr><td>${cp.fullName}</td><td>${cp.phone}</td><td>${branch ? branch.location : "-"}</td><td>${cp.cart.length}</td><td>${cp.orderIds.length}</td></tr>`;
          })
          .join("") || `<tr><td colspan="5">No customer profiles.</td></tr>`;
    }

    const tillsTableBody = document.getElementById("tillsTableBody");
    const tillBranch = document.getElementById("tillBranch");
    if (tillBranch) {
      tillBranch.innerHTML = state.branches
        .map((b) => `<option value="${b.id}">${b.location || b.name}</option>`)
        .join("");
    }
    if (tillsTableBody) {
      tillsTableBody.innerHTML =
        state.tills
          .map((t) => {
            const branch = state.branches.find((b) => b.id === t.branchId);
            return `<tr><td>${branch ? branch.location : t.branchId}</td><td>${t.tillNumber}</td><td>${t.businessShortCode}</td><td>${t.accountReference}</td><td>${t.active ? "Active" : "Inactive"}</td></tr>`;
          })
          .join("") || `<tr><td colspan="5">No tills configured.</td></tr>`;
    }
    const tillForm = document.getElementById("tillForm");
    if (tillForm) {
      tillForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!isSuper) {
          notify("Only super-admin can manage tills.", "warn");
          return;
        }
        const fresh = loadState();
        const branchId = document.getElementById("tillBranch").value;
        const tillNumber = document.getElementById("tillNumber").value.trim();
        const shortCode = document.getElementById("tillShortCode").value.trim();
        const accountReference = document.getElementById("tillAccountRef").value.trim();
        let till = fresh.tills.find((t) => t.branchId === branchId);
        if (!till) {
          till = {
            id: uid("till"),
            branchId,
            type: "BUY_GOODS",
            tillNumber,
            businessShortCode: shortCode,
            accountReference,
            active: true
          };
          fresh.tills.push(till);
        } else {
          till.tillNumber = tillNumber;
          till.businessShortCode = shortCode;
          till.accountReference = accountReference;
          till.active = true;
        }
        await persistAdminState(fresh, "save_till");
      };
    }

    const categories = state.categories || [];
    const categoryOptions = document.getElementById("productCategoryOptions");
    if (categoryOptions) {
      categoryOptions.innerHTML = categories.map((c) => `<option value="${c}"></option>`).join("");
    }

    const productsTableBody = document.getElementById("productsTableBody");
    if (productsTableBody) {
      const searchInput = document.getElementById("catalogSearch");
      const selectionCard = document.getElementById("catalogSelectionCard");
      const selectionState = document.getElementById("catalogSelectedState");

      const renderCatalogSelection = (product) => {
        if (!selectionCard || !selectionState) return;
        if (!product) {
          selectionCard.classList.add("hidden");
          selectionState.textContent = "Click a row to preview product details.";
          return;
        }
        const variantsSummary = (product.variants || [])
          .map((v) => `${v.volume}: ${fmtKES(v.price)} (${v.stock} in stock)`)
          .join(" | ");
        selectionState.innerHTML = `<strong>${product.name}</strong><br>${product.category || "Uncategorized"}<br>${variantsSummary || "No variants configured."}`;
        selectionCard.classList.remove("hidden");
      };

      const drawProducts = () => {
        const fresh = loadState();
        const term = searchInput ? String(searchInput.value || "").trim().toLowerCase() : "";
        const selectedProductId = sessionStorage.getItem(ADMIN_CATALOG_SELECTION_KEY);
        const categoryIcon = (category) => {
          const value = String(category || "").toLowerCase();
          if (value.includes("whiskey") || value.includes("bourbon")) return "WK";
          if (value.includes("wine")) return "WN";
          if (value.includes("vodka")) return "VD";
          if (value.includes("gin")) return "GN";
          if (value.includes("beer") || value.includes("lager")) return "BR";
          return "SP";
        };
        const rows = fresh.products
          .filter((p) => {
            if (!term) return true;
            return p.name.toLowerCase().includes(term) || String(p.category || "").toLowerCase().includes(term);
          })
          .map((p) => {
            const v = p.variants && p.variants[0] ? p.variants[0] : { volume: "-", price: 0, stock: 0 };
            const rowClass = selectedProductId === p.id ? "catalog-row is-selected" : "catalog-row";
            return `<tr class="${rowClass}" data-product-id="${p.id}"><td><span class="catalog-icon">${categoryIcon(p.category)}</span></td><td>${p.name}</td><td>${p.category || "-"}</td><td>${v.volume}</td><td>${fmtKES(v.price)}</td><td>${v.stock}</td><td><button data-act="stock" data-id="${p.id}" class="secondary">Toggle Stock</button></td><td><button data-act="del" data-id="${p.id}" class="secondary">Delete</button></td></tr>`;
          })
          .join("");
        productsTableBody.innerHTML = rows || `<tr><td colspan="8">No products found.</td></tr>`;
        if (!selectedProductId) return;
        const selected = fresh.products.find((p) => p.id === selectedProductId);
        if (selected) {
          renderCatalogSelection(selected);
        } else {
          sessionStorage.removeItem(ADMIN_CATALOG_SELECTION_KEY);
          renderCatalogSelection(null);
        }
      };
      drawProducts();
      if (searchInput) searchInput.oninput = drawProducts;

      productsTableBody.onclick = async (e) => {
        const btn = e.target.closest("button");
        const row = e.target.closest("tr[data-product-id]");
        if (btn) {
          const fresh = loadState();
          const p = fresh.products.find((x) => x.id === btn.dataset.id);
          if (!p) return;
          let actionName = "";
          if (btn.dataset.act === "stock") {
            p.variants.forEach((v) => (v.stock = v.stock > 0 ? 0 : 10));
            actionName = "toggle_product_stock";
          }
          if (btn.dataset.act === "del") {
            fresh.products = fresh.products.filter((x) => x.id !== btn.dataset.id);
            if (sessionStorage.getItem(ADMIN_CATALOG_SELECTION_KEY) === btn.dataset.id) {
              sessionStorage.removeItem(ADMIN_CATALOG_SELECTION_KEY);
            }
            actionName = "delete_product";
          }
          if (!actionName) return;
          await persistAdminState(fresh, actionName);
          return;
        }
        if (!row) return;
        const fresh = loadState();
        const selectedProduct = fresh.products.find((p) => p.id === row.dataset.productId);
        if (!selectedProduct) {
          sessionStorage.removeItem(ADMIN_CATALOG_SELECTION_KEY);
          renderCatalogSelection(null);
          drawProducts();
          return;
        }
        sessionStorage.setItem(ADMIN_CATALOG_SELECTION_KEY, selectedProduct.id);
        renderCatalogSelection(selectedProduct);
        drawProducts();
      };
    }

    const productForm = document.getElementById("productForm");
    if (productForm) {
      const trackedFields = ["productName", "productCategory", "productVolume", "productPrice", "productStock", "productDesc"];
      trackedFields.forEach((fieldId) => {
        const field = document.getElementById(fieldId);
        if (!field) return;
        field.addEventListener("input", () => field.classList.remove("field-invalid"));
      });

      const markFieldInvalid = (fieldId, message) => {
        const field = document.getElementById(fieldId);
        if (field) {
          field.classList.add("field-invalid");
          field.focus();
        }
        if (message) notify(message, "warn");
      };

      productForm.onsubmit = async (e) => {
        e.preventDefault();
        const nameValue = document.getElementById("productName").value.trim();
        const categoryValue = document.getElementById("productCategory").value.trim();
        const volumeValue = document.getElementById("productVolume").value.trim();
        const priceValue = Number(document.getElementById("productPrice").value);
        const stockValue = Number(document.getElementById("productStock").value);
        const descriptionValue = document.getElementById("productDesc").value.trim();

        if (!nameValue) return markFieldInvalid("productName", "Enter a product name.");
        if (!categoryValue) return markFieldInvalid("productCategory", "Enter a product category.");
        if (!volumeValue) return markFieldInvalid("productVolume", "Enter a product volume.");
        if (!Number.isFinite(priceValue) || priceValue <= 0) {
          return markFieldInvalid("productPrice", "Price must be greater than zero.");
        }
        if (!Number.isFinite(stockValue) || stockValue < 0) {
          return markFieldInvalid("productStock", "Stock cannot be negative.");
        }
        if (!descriptionValue) return markFieldInvalid("productDesc", "Enter a short product description.");

        const btn = productForm.querySelector('button[type="submit"]');
        const originalText = btn ? btn.textContent : "Save Product";

        let imageUrl = "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=700&q=70";
        const fileInput = document.getElementById("productImageFile");
        if (btn && fileInput && fileInput.files.length > 0 && window.supabaseClient) {
          btn.textContent = "Uploading Image...";
          btn.disabled = true;
          const file = fileInput.files[0];
          const fileExt = file.name.split('.').pop();
          const fileName = `${uid('img')}.${fileExt}`;
          const filePath = `products/${fileName}`;
          const { error } = await window.supabaseClient.storage.from('product_images').upload(filePath, file);
          if (!error) {
            const { data } = window.supabaseClient.storage.from('product_images').getPublicUrl(filePath);
            if (data && data.publicUrl) imageUrl = data.publicUrl;
          } else {
            console.error("Upload error:", error);
            notify("Image upload failed. Using default image.", "warn");
          }
          btn.textContent = originalText;
          btn.disabled = false;
        }

        const fresh = loadState();
        fresh.products.push({
          id: uid("p"),
          name: nameValue,
          category: categoryValue,
          description: descriptionValue,
          image: imageUrl,
          popular: document.getElementById("productPopular").checked,
          newArrival: document.getElementById("productNew").checked,
          variants: [{ id: uid("v"), volume: volumeValue, price: priceValue, stock: stockValue }]
        });
        const newCategory = categoryValue;
        if (newCategory && !fresh.categories.includes(newCategory)) {
          fresh.categories.push(newCategory);
        }
        await persistAdminState(fresh, "create_product");
      };
    }

    const ridersTableBody = document.getElementById("ridersTableBody");
    if (ridersTableBody) {
      ridersTableBody.innerHTML =
        state.riders.map((r) => `<tr><td>${r.name}</td><td>${r.phone}</td><td>${r.active ? "Active" : "Inactive"}</td></tr>`).join("")
        || `<tr><td colspan="3">No riders.</td></tr>`;
    }
    const riderForm = document.getElementById("riderForm");
    if (riderForm) {
      riderForm.onsubmit = async (e) => {
        e.preventDefault();
        const fresh = loadState();
        fresh.riders.push({ id: uid("r"), name: document.getElementById("riderName").value.trim(), phone: document.getElementById("riderPhone").value.trim(), pin: document.getElementById("riderPin").value.trim(), active: true });
        await persistAdminState(fresh, "create_rider");
      };
    }

    const orderVariant = document.getElementById("orderVariant");
    const paymentSel = document.getElementById("orderPayment");
    const orderForm = document.getElementById("orderForm");
    if (orderVariant) {
      orderVariant.innerHTML = variants.map((row) => `<option value="${row.product.id}|${row.variant.id}">${row.product.name} - ${row.variant.volume} (${fmtKES(row.variant.price)})</option>`).join("");
    }
    if (paymentSel) {
      paymentSel.innerHTML = PAYMENT_STATUSES.map((p) => `<option value="${p}">${p.replaceAll("_", " ")}</option>`).join("");
    }
    if (orderForm && orderVariant) {
      orderForm.onsubmit = async (e) => {
        e.preventDefault();
        const fresh = loadState();
        const [pId, vId] = orderVariant.value.split("|");
        const qty = Number(document.getElementById("orderQty").value);
        const paymentStatus = document.getElementById("orderPayment").value;
        const customerPhone = document.getElementById("orderCustomer").value.trim();
        const prod = fresh.products.find((p) => p.id === pId);
        const variant = prod ? prod.variants.find((v) => v.id === vId) : null;
        if (!prod || !variant) {
          notify("Invalid product variant selected.", "warn");
          return;
        }
        if (variant.stock < qty) {
          notify("Insufficient stock for selected quantity.", "warn");
          return;
        }
        const total = qty * variant.price;
        variant.stock -= qty;
        fresh.orders.push({ id: uid("o"), customerPhone, source: "CALL", paymentStatus, status: "CONFIRMED", total, createdAt: nowISO(), createdBy: session.username, branchId: session.branchId, items: [{ productId: prod.id, productName: prod.name, variantId: variant.id, volume: variant.volume, qty, unitPrice: variant.price, lineTotal: total }] });
        await persistAdminState(fresh, "create_call_order");
      };
    }

    const assignOrderEl = document.getElementById("assignOrder");
    const assignRiderEl = document.getElementById("assignRider");
    const assignForm = document.getElementById("assignForm");
    if (assignRiderEl) {
      const riderOptions = state.riders.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
      assignRiderEl.innerHTML = riderOptions || `<option value="">No active riders. Add one in Rider Management.</option>`;
    }
    if (assignOrderEl) {
      const assigned = new Set(state.deliveries.map((d) => d.orderId));
      const unassignedOrders = state.orders.filter((o) => !assigned.has(o.id));
      assignOrderEl.innerHTML =
        unassignedOrders.map((o) => `<option value="${o.id}">${o.id} - ${fmtKES(o.total)} - ${o.customerPhone}</option>`).join("")
        || `<option value="">No unassigned orders. Create order first.</option>`;
    }
    if (assignForm && assignOrderEl && assignRiderEl) {
      assignForm.onsubmit = async (e) => {
        e.preventDefault();
        const orderId = assignOrderEl.value;
        const riderId = assignRiderEl.value;
        if (!orderId) {
          notify("No unassigned order is available right now.", "warn");
          return;
        }
        const fresh = loadState();
        const start = DELIVERY_STATUSES[0];
        fresh.deliveries.push({ id: uid("d"), orderId, riderId, status: start, timeline: [{ status: start, at: nowISO() }] });
        await persistAdminState(fresh, "assign_delivery");
      };
    }

    const ordersTableBody = document.getElementById("ordersTableBody");
    if (ordersTableBody) {
      const paymentBadgeClass = (status) => (status === "PAID" ? "ok" : "warn");
      const paymentLabel = (status) => String(status || "-").replaceAll("_", " ");

      const drawOrders = () => {
        const fresh = loadState();
        const expandedId = sessionStorage.getItem(ADMIN_ORDER_EXPANDED_KEY);
        ordersTableBody.innerHTML =
          fresh.orders
            .map((o) => {
              const isExpanded = expandedId === o.id;
              const details = (o.items || [])
                .map((item) => `${item.productName} ${item.volume} x${item.qty} = ${fmtKES(item.lineTotal)}`)
                .join("<br>");
              return `<tr class="order-main-row ${isExpanded ? "is-expanded" : ""}" data-order-id="${o.id}"><td><button class="secondary" data-act="expand-order" data-id="${o.id}">${isExpanded ? "Hide" : "View"}</button> ${o.id}</td><td>${o.customerPhone}</td><td>${summarizeItems(o.items, 2)}</td><td>${fmtKES(o.total)}</td><td><span class="badge ${paymentBadgeClass(o.paymentStatus)}">${paymentLabel(o.paymentStatus)}</span></td><td>${dateOnly(o.createdAt)}</td></tr><tr class="order-detail-row ${isExpanded ? "" : "hidden"}" data-order-detail-id="${o.id}"><td colspan="6"><strong>Order Details</strong><br>${details || "No items captured."}<br><span class="small">Source: ${o.source || "-"} | Created by: ${o.createdBy || "-"} | Branch: ${o.branchId || "-"}</span></td></tr>`;
            })
            .join("") || `<tr><td colspan="6">No orders yet. Create your first call order in Operations.</td></tr>`;
      };

      drawOrders();
      ordersTableBody.onclick = (e) => {
        const trigger = e.target.closest("[data-act='expand-order']");
        const row = e.target.closest("tr[data-order-id]");
        const orderId = trigger ? trigger.dataset.id : row ? row.dataset.orderId : "";
        if (!orderId) return;
        const expandedId = sessionStorage.getItem(ADMIN_ORDER_EXPANDED_KEY);
        if (expandedId === orderId) {
          sessionStorage.removeItem(ADMIN_ORDER_EXPANDED_KEY);
        } else {
          sessionStorage.setItem(ADMIN_ORDER_EXPANDED_KEY, orderId);
        }
        drawOrders();
      };
    }

    const deliveriesTableBody = document.getElementById("deliveriesTableBody");
    if (deliveriesTableBody) {
      const deliveryTone = (status) => {
        if (status === "DELIVERED") return "ok";
        if (status === "ON_THE_WAY") return "gold";
        return "warn";
      };
      const deliveryLabel = (status) => String(status || "-").replaceAll("_", " ");
      const deliveryIcon = (status) => {
        const map = {
          ASSIGNED: "A",
          PICKED_UP: "P",
          ON_THE_WAY: "O",
          DELIVERED: "D"
        };
        return map[status] || "?";
      };

      const drawDeliveries = () => {
        const fresh = loadState();
        deliveriesTableBody.innerHTML =
          fresh.deliveries
            .map((d) => {
              const rider = fresh.riders.find((r) => r.id === d.riderId);
              const order = fresh.orders.find((o) => o.id === d.orderId);
              const currentIndex = DELIVERY_STATUSES.indexOf(d.status);
              const updateControls = DELIVERY_STATUSES.map((status, index) => {
                const isCurrent = status === d.status;
                const canAdvance = index === currentIndex + 1;
                const done = index <= currentIndex;
                const classes = `secondary status-step${isCurrent ? " is-current" : ""}${done ? " is-done" : ""}`;
                const disabled = canAdvance ? "" : "disabled";
                return `<button class="${classes}" data-act="set-delivery-status" data-id="${d.id}" data-status="${status}" ${disabled}>${deliveryIcon(status)} ${deliveryLabel(status)}</button>`;
              }).join("");
              const latest = d.timeline && d.timeline.length ? d.timeline[d.timeline.length - 1].at : nowISO();
              return `<tr><td>${d.id}</td><td>${rider ? rider.name : "Unknown"}</td><td>${order ? order.customerPhone : "-"}</td><td>${order ? summarizeItems(order.items, 1) : "-"}</td><td><span class="badge ${deliveryTone(d.status)}">${deliveryLabel(d.status)}</span></td><td>${latest.replace("T", " ").slice(0, 16)}</td><td><div class="status-step-group">${updateControls}</div></td></tr>`;
            })
            .join("") || `<tr><td colspan="7">No deliveries yet. Assign a rider from the Delivery page.</td></tr>`;
      };

      drawDeliveries();
      deliveriesTableBody.onclick = async (e) => {
        const btn = e.target.closest("button[data-act='set-delivery-status']");
        if (!btn || btn.disabled) return;
        const fresh = loadState();
        const delivery = fresh.deliveries.find((d) => d.id === btn.dataset.id);
        if (!delivery) return;
        const currentIndex = DELIVERY_STATUSES.indexOf(delivery.status);
        const targetStatus = btn.dataset.status;
        const targetIndex = DELIVERY_STATUSES.indexOf(targetStatus);
        if (targetIndex !== currentIndex + 1) {
          notify("Delivery can only move one step forward at a time.", "warn");
          return;
        }
        delivery.status = targetStatus;
        delivery.timeline = Array.isArray(delivery.timeline) ? delivery.timeline : [];
        delivery.timeline.push({ status: targetStatus, at: nowISO() });
        if (targetStatus === "DELIVERED") {
          const order = fresh.orders.find((o) => o.id === delivery.orderId);
          if (order) order.status = "COMPLETED";
        }
        await persistAdminState(fresh, "update_delivery_status");
      };
    }

    const shiftBranch = document.getElementById("shiftBranch");
    const shiftUser = document.getElementById("shiftUser");
    const shiftCurrent = document.getElementById("shiftCurrent");
    if (shiftBranch && shiftUser && shiftCurrent) {
      const branches = isSuper ? state.branches : state.branches.filter((b) => !session.branchId || b.id === session.branchId);
      shiftBranch.innerHTML = branches.map((b) => `<option value="${b.id}">${b.location || b.name}</option>`).join("");
      const drawShiftUsers = () => {
        const fresh = loadState();
        const branch = fresh.branches.find((b) => b.id === shiftBranch.value);
        if (!branch) return;
        const users = fresh.users.filter((u) => u.active && (u.branchId === branch.id || u.role === "super-admin"));
        shiftUser.innerHTML = users.map((u) => `<option value="${u.id}">${u.name} (${u.username})</option>`).join("");
        if (branch.onShiftUserId) shiftUser.value = branch.onShiftUserId;
        const current = users.find((u) => u.id === branch.onShiftUserId);
        shiftCurrent.textContent = current ? `Current on-shift: ${current.name} (${current.phone})` : "No on-shift user set.";
      };
      shiftBranch.onchange = drawShiftUsers;
      drawShiftUsers();
      document.getElementById("shiftForm").onsubmit = async (e) => {
        e.preventDefault();
        const fresh = loadState();
        const branch = fresh.branches.find((b) => b.id === shiftBranch.value);
        if (!branch) return;
        branch.onShiftUserId = shiftUser.value;
        const user = fresh.users.find((u) => u.id === shiftUser.value);
        if (user && user.phone) branch.phone = user.phone;
        await persistAdminState(fresh, "update_shift_contact", {
          rerender: false,
          onSuccess: () => {
            drawShiftUsers();
            notify("On-shift contact updated.", "ok");
          }
        });
      };
    }

    const managerForm = document.getElementById("managerForm");
    const managerBranch = document.getElementById("managerBranch");
    const managerTable = document.getElementById("managerTableBody");
    if (managerForm && managerBranch && managerTable) {
      managerBranch.innerHTML = state.branches.map((b) => `<option value="${b.id}">${b.location || b.name}</option>`).join("");
      const drawManagers = () => {
        const fresh = loadState();
        managerTable.innerHTML = fresh.users.map((u) => {
          const branch = fresh.branches.find((b) => b.id === u.branchId);
          return `<tr><td>${u.name}</td><td>${u.username}</td><td>${u.role}</td><td>${branch ? branch.location : "All"}</td></tr>`;
        }).join("");
      };
      drawManagers();
      managerForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!isSuper) {
          notify("Only super-admin can add managers.", "warn");
          return;
        }
        const fresh = loadState();
        const username = document.getElementById("managerUsername").value.trim();
        if (fresh.users.find((u) => u.username === username)) {
          notify("Username already exists.", "warn");
          return;
        }
        fresh.users.push({ id: uid("u"), name: document.getElementById("managerName").value.trim(), username, password: document.getElementById("managerPassword").value.trim(), role: "admin", phone: document.getElementById("managerPhone").value.trim(), branchId: managerBranch.value, active: true });
        await persistAdminState(fresh, "create_branch_admin", {
          rerender: false,
          onSuccess: () => {
            managerForm.reset();
            drawManagers();
            notify("Branch admin added.", "ok");
          }
        });
      };
    }

    refreshResponsiveTables();
  }

  function renderRider() {
    const loginWrap = document.getElementById("riderLogin");
    const appWrap = document.getElementById("riderApp");
    const riderId = sessionStorage.getItem(RIDER_SESSION_KEY);
    if (!riderId) {
      loginWrap.classList.remove("hidden");
      appWrap.classList.add("hidden");
      document.getElementById("riderLoginForm").onsubmit = (e) => {
        e.preventDefault();
        const phone = document.getElementById("riderPhoneLogin").value.trim();
        const pin = document.getElementById("riderPinLogin").value.trim();
        const state = loadState();
        const rider = state.riders.find((r) => r.phone === phone && r.pin === pin);
        if (!rider) {
          notify("Invalid rider credentials.", "danger");
          return;
        }
        sessionStorage.setItem(RIDER_SESSION_KEY, rider.id);
        renderRider();
      };
      return;
    }

    loginWrap.classList.add("hidden");
    appWrap.classList.remove("hidden");
    document.getElementById("riderLogout").onclick = () => {
      sessionStorage.removeItem(RIDER_SESSION_KEY);
      renderRider();
    };

    const state = loadState();
    const rider = state.riders.find((r) => r.id === riderId);
    if (!rider) {
      sessionStorage.removeItem(RIDER_SESSION_KEY);
      renderRider();
      return;
    }
    document.getElementById("riderNameLabel").textContent = rider.name;

    // Google Maps logic for rider
    window.initMap = () => {
      const mapEl = document.getElementById("riderMap");
      if (!mapEl || !window.google) return;
      const map = new google.maps.Map(mapEl, {
        zoom: 12,
        center: { lat: -1.286389, lng: 36.817223 },
        mapTypeId: "roadmap"
      });
      mapEl.style.display = "block";

      const s = loadState();
      const bounds = new google.maps.LatLngBounds();
      const mine = s.deliveries.filter((d) => d.riderId === riderId && d.status !== "DELIVERED");
      let hasPins = false;

      mine.forEach(d => {
        const order = s.orders.find((o) => o.id === d.orderId);
        if (order && order.customerLat && order.customerLng) {
          const pos = { lat: order.customerLat, lng: order.customerLng };
          new google.maps.Marker({ position: pos, map, title: `Order ${order.id}`, label: "D" });
          bounds.extend(pos);
          hasPins = true;
        }
      });

      if (hasPins && !bounds.isEmpty()) {
        map.fitBounds(bounds);
      } else {
        mapEl.style.display = "none";
      }
    };

    const statuses = DELIVERY_STATUSES;
    const nextStatus = (s) => {
      const idx = statuses.indexOf(s);
      if (idx === -1 || idx >= statuses.length - 1) return null;
      return statuses[idx + 1];
    };

    const mine = state.deliveries.filter((d) => d.riderId === riderId);
    const pending = mine.filter((d) => d.status !== statuses[statuses.length - 1]);
    const riderActiveCount = document.getElementById("riderActiveCount");
    const riderCompletedCount = document.getElementById("riderCompletedCount");
    if (riderActiveCount) riderActiveCount.textContent = String(pending.length);
    if (riderCompletedCount) {
      riderCompletedCount.textContent = String(mine.filter((d) => d.status === statuses[statuses.length - 1]).length);
    }
    document.getElementById("assignedJobs").innerHTML =
      pending.map((d) => {
        const order = state.orders.find((o) => o.id === d.orderId);
        const ns = nextStatus(d.status);
        return `<article class="card rider-job-card"><div class="card-body"><div class="row"><strong>${d.id}</strong><span class="badge gold">${d.status.replaceAll("_", " ")}</span></div><p class="small">Order: ${d.orderId} | Customer: ${order ? order.customerPhone : "-"}</p><p class="small">Items: ${order ? summarizeItems(order.items, 2) : "-"} | Total: ${order ? fmtKES(order.total) : "-"}</p>${ns ? `<button class="rider-status-btn" data-delivery="${d.id}" data-next="${ns}">Mark ${ns.replaceAll("_", " ")}</button>` : ""}</div></article>`;
      }).join("") || `<p class="small">No active deliveries.</p>`;

    document.getElementById("assignedJobs").onclick = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const fresh = loadState();
      const d = fresh.deliveries.find((x) => x.id === btn.dataset.delivery);
      if (!d) return;
      d.status = btn.dataset.next;
      d.timeline.push({ status: btn.dataset.next, at: nowISO() });
      const order = fresh.orders.find((o) => o.id === d.orderId);
      if (order && d.status === statuses[statuses.length - 1]) order.status = "COMPLETED";
      saveState(fresh);
      notify(`Delivery moved to ${btn.dataset.next.replaceAll("_", " ")}.`, "ok");
      renderRider();
    };

    document.getElementById("riderHistoryBody").innerHTML =
      mine.map((d) => {
        const order = state.orders.find((o) => o.id === d.orderId);
        return `<tr><td>${d.id}</td><td>${order ? summarizeItems(order.items, 2) : "-"}</td><td>${d.status}</td><td>${d.timeline[d.timeline.length - 1].at.replace("T", " ").slice(0, 16)}</td></tr>`;
      }).join("") || `<tr><td colspan="4">No history yet. Completed jobs will appear here.</td></tr>`;
    refreshResponsiveTables();
  }

  async function initApp() {
    if (window.supabaseClient) {
      try {
        logClient("info", "INIT", "Loading remote state from Supabase...");
        const { data, error } = await window.supabaseClient.from('app_state').select('state').eq('id', 'karebe_mvp_state').single();
        if (error) {
          logClient("warn", "INIT", "Remote state load returned error; using local/seed fallback.", error);
        }
        if (data && data.state) {
          const seed = clone(window.KAREBE_SEED || {});
          const merged = reconcile(data.state, seed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          logClient("info", "INIT", "Remote state loaded and reconciled.");
        } else {
          logClient("info", "INIT", "No remote state found; using local/seed state.");
        }
      } catch (err) {
        logClient("error", "INIT", "Remote state load failed; using local/seed fallback.", err);
      }
    } else {
      logClient("warn", "INIT", "Supabase client not available; running local-only.");
    }

    const page = document.body.dataset.page;
    if (page === "customer") renderCustomer();
    if (page && page.startsWith("admin")) renderAdmin();
    if (page === "rider") renderRider();
  }

  if (window.__KAREBE_ENABLE_TEST_API__) {
    window.__KAREBE_TEST_API = {
      reconcile,
      loadState,
      saveState,
      initApp
    };
  }

  initApp();
})();
