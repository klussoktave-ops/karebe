(function () {
  const STORAGE_KEY = "karebe_state_v1";
  const ADMIN_SESSION_KEY = "karebe_admin_session";
  const RIDER_SESSION_KEY = "karebe_rider_id";
  const CUSTOMER_BRANCH_KEY = "karebe_customer_branch";

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function fmtKES(n) {
    return `KES ${Number(n || 0).toLocaleString()}`;
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

  function defaults() {
    return {
      taxonomies: {
        categories: ["Wine", "Whiskey", "Vodka", "Gin", "Champagne", "Local Spirits", "Keg"],
        paymentStatuses: ["PENDING", "PAID"],
        deliveryStatuses: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED"]
      }
    };
  }

  function reconcile(state, seed) {
    const next = clone(state || {});
    const d = defaults();
    next.users = Array.isArray(next.users) ? next.users : clone(seed.users || []);
    next.branches = Array.isArray(next.branches) ? next.branches : clone(seed.branches || []);
    next.taxonomies = next.taxonomies && typeof next.taxonomies === "object" ? next.taxonomies : {};
    Object.keys(d.taxonomies).forEach((k) => {
      next.taxonomies[k] = Array.isArray(next.taxonomies[k])
        ? next.taxonomies[k]
        : clone((seed.taxonomies && seed.taxonomies[k]) || d.taxonomies[k]);
    });
    next.categories = Array.isArray(next.categories) ? next.categories : [];
    next.taxonomies.categories.forEach((c) => {
      if (!next.categories.includes(c)) next.categories.push(c);
    });
    next.products = Array.isArray(next.products) ? next.products : clone(seed.products || []);
    (seed.products || []).forEach((p) => {
      if (!next.products.find((x) => x.id === p.id)) next.products.push(clone(p));
    });
    next.riders = Array.isArray(next.riders) ? next.riders : clone(seed.riders || []);
    next.orders = Array.isArray(next.orders) ? next.orders : [];
    next.deliveries = Array.isArray(next.deliveries) ? next.deliveries : [];
    next.cart = Array.isArray(next.cart) ? next.cart : [];
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

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
      branchId
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
    const categorySel = document.getElementById("categoryFilter");
    const popularSel = document.getElementById("popularFilter");
    const newSel = document.getElementById("newFilter");
    const maxPrice = document.getElementById("maxPrice");
    const branchSel = document.getElementById("branchSelect");
    const shiftContact = document.getElementById("shiftContact");
    const list = document.getElementById("products");
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");
    const cartCall = document.getElementById("cartCall");
    const cartSms = document.getElementById("cartSms");
    const cartWa = document.getElementById("cartWhatsapp");
    const cartClear = document.getElementById("cartClear");

    const categories = state.taxonomies.categories || state.categories;
    categorySel.innerHTML = `<option value="">All Categories</option>${categories.map((c) => `<option value="${c}">${c}</option>`).join("")}`;
    if (branchSel) {
      branchSel.innerHTML = state.branches.map((b) => `<option value="${b.id}">${b.location || b.name}</option>`).join("");
      branchSel.value = selectedBranchId(state);
    }

    function currentBranchId() {
      return (branchSel && branchSel.value) || selectedBranchId(loadState());
    }

    function qtyFor(productId, variantId) {
      const el = document.getElementById(`qty_${productId}_${variantId}`);
      return Math.max(1, Number(el ? el.value : 1) || 1);
    }

    function renderCart() {
      if (!cartItems || !cartTotal) return;
      const fresh = loadState();
      const branchId = currentBranchId();
      const items = fresh.cart.filter((i) => i.branchId === branchId);
      const total = items.reduce((s, i) => s + i.lineTotal, 0);
      const contact = getShiftContact(fresh, branchId);
      cartItems.innerHTML = items.length
        ? items.map((i) => `<div class="cart-row"><span>${i.productName} (${i.volume}) x${i.qty}</span><span>${fmtKES(i.lineTotal)}</span><button class="secondary" data-act="remove" data-id="${i.id}">Remove</button></div>`).join("")
        : `<p class="small">Your cart is empty for this branch.</p>`;
      cartTotal.textContent = fmtKES(total);
      if (shiftContact) shiftContact.textContent = `On shift: ${contact.label} - ${contact.phone}`;
      if (cartCall) cartCall.onclick = () => { window.location.href = `tel:${contact.phone}`; };
      if (cartSms) cartSms.onclick = () => {
        if (!items.length) return alert("Add items to cart first.");
        window.location.href = `sms:${contact.phone}?body=${encodeURIComponent(buildMessage(fresh, contact, items))}`;
      };
      if (cartWa) cartWa.onclick = () => {
        if (!items.length) return alert("Add items to cart first.");
        window.open(`https://wa.me/${contact.whatsappPhone}?text=${encodeURIComponent(buildMessage(fresh, contact, items))}`, "_blank", "noopener");
      };
      if (cartClear) cartClear.onclick = () => {
        const s = loadState();
        s.cart = s.cart.filter((i) => i.branchId !== branchId);
        saveState(s);
        renderCart();
      };
    }

    function card(product, variant, contact) {
      const inStock = variant.stock > 0;
      return `
      <article class="card">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <div class="card-body">
          <div class="row"><strong>${product.name}</strong><span class="badge ${inStock ? "ok" : "danger"}">${inStock ? "In Stock" : "Out"}</span></div>
          <p class="small">${product.description}</p>
          <div class="row"><span class="badge">${product.category}</span><span class="badge gold">${variant.volume}</span></div>
          <div class="row" style="margin-top:8px;"><strong>${fmtKES(variant.price)}</strong><input id="qty_${product.id}_${variant.id}" type="number" min="1" value="1" style="max-width:72px;" /></div>
          <div class="actions" style="margin-top:8px;">
            <button data-act="call" data-pid="${product.id}" data-vid="${variant.id}" ${!inStock ? "disabled" : ""}>Order Call</button>
            <button class="secondary" data-act="sms" data-pid="${product.id}" data-vid="${variant.id}" ${!inStock ? "disabled" : ""}>SMS</button>
            <button class="secondary" data-act="wa" data-pid="${product.id}" data-vid="${variant.id}" ${!inStock ? "disabled" : ""}>WhatsApp</button>
          </div>
          <div class="actions" style="margin-top:8px;"><button class="secondary" data-act="cart" data-pid="${product.id}" data-vid="${variant.id}" ${!inStock ? "disabled" : ""}>Add To Cart</button><span class="small">Routes to ${contact.label}</span></div>
        </div>
      </article>`;
    }

    function draw() {
      const fresh = loadState();
      const branchId = currentBranchId();
      const contact = getShiftContact(fresh, branchId);
      const cards = [];
      fresh.products.forEach((p) => {
        const v = p.variants && p.variants[0];
        if (!v) return;
        if (categorySel.value && p.category !== categorySel.value) return;
        if (popularSel.value === "yes" && !p.popular) return;
        if (newSel.value === "yes" && !p.newArrival) return;
        if (v.price > Number(maxPrice.value || 999999)) return;
        cards.push(card(p, v, contact));
      });
      list.innerHTML = cards.length ? cards.join("") : `<p class="small">No products match your filters.</p>`;
      renderCart();
    }

    list.onclick = (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const fresh = loadState();
      const branchId = currentBranchId();
      const contact = getShiftContact(fresh, branchId);
      const p = fresh.products.find((x) => x.id === btn.dataset.pid);
      const v = p && p.variants.find((x) => x.id === btn.dataset.vid);
      if (!p || !v) return;
      const qty = qtyFor(p.id, v.id);
      const item = makeItem(p, v, qty, branchId);
      if (btn.dataset.act === "call") return (window.location.href = `tel:${contact.phone}`);
      if (btn.dataset.act === "sms") return (window.location.href = `sms:${contact.phone}?body=${encodeURIComponent(buildMessage(fresh, contact, [item]))}`);
      if (btn.dataset.act === "wa") return window.open(`https://wa.me/${contact.whatsappPhone}?text=${encodeURIComponent(buildMessage(fresh, contact, [item]))}`, "_blank", "noopener");
      if (btn.dataset.act === "cart") {
        const existing = fresh.cart.find((i) => i.productId === item.productId && i.variantId === item.variantId && i.branchId === item.branchId);
        if (existing) {
          existing.qty += item.qty;
          existing.lineTotal = existing.qty * existing.unitPrice;
        } else {
          fresh.cart.push(item);
        }
        saveState(fresh);
        renderCart();
      }
    };

    if (cartItems) {
      cartItems.onclick = (e) => {
        const btn = e.target.closest("button[data-act='remove']");
        if (!btn) return;
        const s = loadState();
        s.cart = s.cart.filter((i) => i.id !== btn.dataset.id);
        saveState(s);
        renderCart();
      };
    }

    [categorySel, popularSel, newSel, maxPrice].forEach((el) => el.addEventListener("change", draw));
    if (branchSel) branchSel.addEventListener("change", () => { localStorage.setItem(CUSTOMER_BRANCH_KEY, branchSel.value); draw(); });
    draw();
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
    const session = getAdminSession();

    if (!session) {
      loginWrap.classList.remove("hidden");
      appWrap.classList.add("hidden");
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
          location.reload();
        } else {
          alert("Invalid credentials");
        }
      };
      return;
    }

    loginWrap.classList.add("hidden");
    appWrap.classList.remove("hidden");
    const isSuper = session.role === "super-admin";
    const identity = document.getElementById("adminIdentity");
    if (identity) identity.textContent = `${session.name || session.username} (${session.role})`;
    document.querySelectorAll(".super-only").forEach((el) => el.classList.toggle("hidden", !isSuper));

    document.getElementById("adminLogout").onclick = () => {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      location.reload();
    };

    const variants = getAllVariants(state);
    document.getElementById("kpiToday").textContent = fmtKES(
      state.orders.filter((o) => dateOnly(o.createdAt) === dateOnly(nowISO())).reduce((s, o) => s + o.total, 0)
    );
    document.getElementById("kpiWeek").textContent = fmtKES(
      state.orders.filter((o) => inRangeDays(o.createdAt, 7)).reduce((s, o) => s + o.total, 0)
    );
    document.getElementById("kpiMonth").textContent = fmtKES(
      state.orders.filter((o) => inRangeDays(o.createdAt, 30)).reduce((s, o) => s + o.total, 0)
    );
    document.getElementById("kpiActive").textContent = String(
      state.deliveries.filter((d) => d.status !== "DELIVERED").length
    );

    const freq = {};
    state.orders.forEach((o) => o.items.forEach((i) => (freq[i.productName] = (freq[i.productName] || 0) + i.qty)));
    document.getElementById("topProducts").textContent =
      Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, qty]) => `${name} (${qty})`)
        .join(", ") || "No orders yet";

    document.getElementById("riderPerformance").textContent =
      state.riders
        .map((r) => `${r.name}: ${state.deliveries.filter((d) => d.riderId === r.id && d.status === "DELIVERED").length}`)
        .join(" | ") || "No rider data";

    const categories = state.taxonomies.categories || state.categories;
    const categorySel = document.getElementById("productCategory");
    categorySel.innerHTML = categories.map((c) => `<option value="${c}">${c}</option>`).join("");

    document.getElementById("productsTableBody").innerHTML =
      state.products
        .map((p) => {
          const v = p.variants[0];
          return `<tr><td>${p.name}</td><td>${p.category}</td><td>${v.volume}</td><td>${fmtKES(v.price)}</td><td>${v.stock}</td><td><button data-act="stock" data-id="${p.id}" class="secondary">Toggle Stock</button></td><td><button data-act="del" data-id="${p.id}" class="secondary">Delete</button></td></tr>`;
        })
        .join("") || `<tr><td colspan="7">No products.</td></tr>`;

    document.getElementById("productsTableBody").onclick = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const fresh = loadState();
      const p = fresh.products.find((x) => x.id === btn.dataset.id);
      if (!p) return;
      if (btn.dataset.act === "stock") p.variants.forEach((v) => (v.stock = v.stock > 0 ? 0 : 10));
      if (btn.dataset.act === "del") fresh.products = fresh.products.filter((x) => x.id !== btn.dataset.id);
      saveState(fresh);
      location.reload();
    };

    document.getElementById("productForm").onsubmit = (e) => {
      e.preventDefault();
      const fresh = loadState();
      fresh.products.push({
        id: uid("p"),
        name: document.getElementById("productName").value.trim(),
        category: document.getElementById("productCategory").value,
        description: document.getElementById("productDesc").value.trim(),
        image: document.getElementById("productImage").value.trim() || "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=700&q=70",
        popular: document.getElementById("productPopular").checked,
        newArrival: document.getElementById("productNew").checked,
        variants: [{ id: uid("v"), volume: document.getElementById("productVolume").value.trim(), price: Number(document.getElementById("productPrice").value), stock: Number(document.getElementById("productStock").value) }]
      });
      saveState(fresh);
      location.reload();
    };

    document.getElementById("ridersTableBody").innerHTML =
      state.riders.map((r) => `<tr><td>${r.name}</td><td>${r.phone}</td><td>${r.active ? "Active" : "Inactive"}</td></tr>`).join("") || `<tr><td colspan="3">No riders.</td></tr>`;
    document.getElementById("riderForm").onsubmit = (e) => {
      e.preventDefault();
      const fresh = loadState();
      fresh.riders.push({ id: uid("r"), name: document.getElementById("riderName").value.trim(), phone: document.getElementById("riderPhone").value.trim(), pin: document.getElementById("riderPin").value.trim(), active: true });
      saveState(fresh);
      location.reload();
    };

    const orderVariant = document.getElementById("orderVariant");
    orderVariant.innerHTML = variants.map((row) => `<option value="${row.product.id}|${row.variant.id}">${row.product.name} - ${row.variant.volume} (${fmtKES(row.variant.price)})</option>`).join("");
    const paymentSel = document.getElementById("orderPayment");
    paymentSel.innerHTML = (state.taxonomies.paymentStatuses || ["PENDING", "PAID"]).map((p) => `<option value="${p}">${p.replaceAll("_", " ")}</option>`).join("");
    document.getElementById("orderForm").onsubmit = (e) => {
      e.preventDefault();
      const fresh = loadState();
      const [pId, vId] = orderVariant.value.split("|");
      const qty = Number(document.getElementById("orderQty").value);
      const paymentStatus = document.getElementById("orderPayment").value;
      const customerPhone = document.getElementById("orderCustomer").value.trim();
      const prod = fresh.products.find((p) => p.id === pId);
      const variant = prod ? prod.variants.find((v) => v.id === vId) : null;
      if (!prod || !variant) return alert("Invalid product variant");
      if (variant.stock < qty) return alert("Insufficient stock");
      const total = qty * variant.price;
      variant.stock -= qty;
      fresh.orders.push({ id: uid("o"), customerPhone, source: "CALL", paymentStatus, status: "CONFIRMED", total, createdAt: nowISO(), createdBy: session.username, branchId: session.branchId, items: [{ productId: prod.id, productName: prod.name, variantId: variant.id, volume: variant.volume, qty, unitPrice: variant.price, lineTotal: total }] });
      saveState(fresh);
      location.reload();
    };

    document.getElementById("assignRider").innerHTML = state.riders.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
    const assigned = new Set(state.deliveries.map((d) => d.orderId));
    document.getElementById("assignOrder").innerHTML = state.orders.filter((o) => !assigned.has(o.id)).map((o) => `<option value="${o.id}">${o.id} - ${fmtKES(o.total)} - ${o.customerPhone}</option>`).join("");
    document.getElementById("assignForm").onsubmit = (e) => {
      e.preventDefault();
      const orderId = document.getElementById("assignOrder").value;
      const riderId = document.getElementById("assignRider").value;
      if (!orderId) return alert("No order available for assignment");
      const fresh = loadState();
      const start = (fresh.taxonomies.deliveryStatuses || ["ASSIGNED"])[0];
      fresh.deliveries.push({ id: uid("d"), orderId, riderId, status: start, timeline: [{ status: start, at: nowISO() }] });
      saveState(fresh);
      location.reload();
    };

    document.getElementById("ordersTableBody").innerHTML =
      state.orders.map((o) => `<tr><td>${o.id}</td><td>${o.customerPhone}</td><td>${o.items[0].productName}</td><td>${fmtKES(o.total)}</td><td>${o.paymentStatus}</td><td>${dateOnly(o.createdAt)}</td></tr>`).join("") || `<tr><td colspan="6">No orders.</td></tr>`;

    document.getElementById("deliveriesTableBody").innerHTML =
      state.deliveries.map((d) => {
        const rider = state.riders.find((r) => r.id === d.riderId);
        const order = state.orders.find((o) => o.id === d.orderId);
        return `<tr><td>${d.id}</td><td>${rider ? rider.name : "Unknown"}</td><td>${order ? order.customerPhone : "-"}</td><td>${order ? order.items[0].productName : "-"}</td><td>${d.status}</td><td>${d.timeline[d.timeline.length - 1].at.replace("T", " ").slice(0, 16)}</td></tr>`;
      }).join("") || `<tr><td colspan="6">No deliveries.</td></tr>`;

    const taxonomyGroup = document.getElementById("taxonomyGroup");
    const taxonomyList = document.getElementById("taxonomyList");
    const taxonomyValue = document.getElementById("taxonomyValue");
    if (taxonomyGroup && taxonomyList && taxonomyValue) {
      taxonomyGroup.innerHTML = Object.keys(state.taxonomies).map((k) => `<option value="${k}">${k}</option>`).join("");
      const drawTax = () => {
        const fresh = loadState();
        const values = fresh.taxonomies[taxonomyGroup.value] || [];
        taxonomyList.innerHTML = values.length ? values.map((v) => `<span class="badge">${v}</span>`).join(" ") : `<p class="small">No values yet.</p>`;
      };
      taxonomyGroup.onchange = drawTax;
      drawTax();
      document.getElementById("taxonomyForm").onsubmit = (e) => {
        e.preventDefault();
        const val = taxonomyValue.value.trim();
        if (!val) return;
        const fresh = loadState();
        const key = taxonomyGroup.value;
        fresh.taxonomies[key] = Array.isArray(fresh.taxonomies[key]) ? fresh.taxonomies[key] : [];
        if (!fresh.taxonomies[key].includes(val)) fresh.taxonomies[key].push(val);
        if (key === "categories" && !fresh.categories.includes(val)) fresh.categories.push(val);
        saveState(fresh);
        taxonomyValue.value = "";
        drawTax();
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
      document.getElementById("shiftForm").onsubmit = (e) => {
        e.preventDefault();
        const fresh = loadState();
        const branch = fresh.branches.find((b) => b.id === shiftBranch.value);
        if (!branch) return;
        branch.onShiftUserId = shiftUser.value;
        const user = fresh.users.find((u) => u.id === shiftUser.value);
        if (user && user.phone) branch.phone = user.phone;
        saveState(fresh);
        drawShiftUsers();
        alert("Shift updated.");
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
      managerForm.onsubmit = (e) => {
        e.preventDefault();
        if (!isSuper) return alert("Only super-admin can add managers.");
        const fresh = loadState();
        const username = document.getElementById("managerUsername").value.trim();
        if (fresh.users.find((u) => u.username === username)) return alert("Username exists.");
        fresh.users.push({ id: uid("u"), name: document.getElementById("managerName").value.trim(), username, password: document.getElementById("managerPassword").value.trim(), role: "admin", phone: document.getElementById("managerPhone").value.trim(), branchId: managerBranch.value, active: true });
        saveState(fresh);
        managerForm.reset();
        drawManagers();
      };
    }
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
        if (!rider) return alert("Invalid rider credentials");
        sessionStorage.setItem(RIDER_SESSION_KEY, rider.id);
        location.reload();
      };
      return;
    }

    loginWrap.classList.add("hidden");
    appWrap.classList.remove("hidden");
    document.getElementById("riderLogout").onclick = () => {
      sessionStorage.removeItem(RIDER_SESSION_KEY);
      location.reload();
    };

    const state = loadState();
    const rider = state.riders.find((r) => r.id === riderId);
    if (!rider) {
      sessionStorage.removeItem(RIDER_SESSION_KEY);
      location.reload();
      return;
    }
    document.getElementById("riderNameLabel").textContent = rider.name;

    const statuses = state.taxonomies.deliveryStatuses || ["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED"];
    const nextStatus = (s) => {
      const idx = statuses.indexOf(s);
      if (idx === -1 || idx >= statuses.length - 1) return null;
      return statuses[idx + 1];
    };

    const mine = state.deliveries.filter((d) => d.riderId === riderId);
    const pending = mine.filter((d) => d.status !== statuses[statuses.length - 1]);
    document.getElementById("assignedJobs").innerHTML =
      pending.map((d) => {
        const order = state.orders.find((o) => o.id === d.orderId);
        const ns = nextStatus(d.status);
        return `<article class="card"><div class="card-body"><div class="row"><strong>${d.id}</strong><span class="badge gold">${d.status}</span></div><p class="small">Order: ${d.orderId} | Customer: ${order ? order.customerPhone : "-"}</p><p class="small">Item: ${order ? order.items[0].productName : "-"} | Total: ${order ? fmtKES(order.total) : "-"}</p>${ns ? `<button data-delivery="${d.id}" data-next="${ns}">Mark ${ns.replaceAll("_", " ")}</button>` : ""}</div></article>`;
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
      location.reload();
    };

    document.getElementById("riderHistoryBody").innerHTML =
      mine.map((d) => {
        const order = state.orders.find((o) => o.id === d.orderId);
        return `<tr><td>${d.id}</td><td>${order ? order.items[0].productName : "-"}</td><td>${d.status}</td><td>${d.timeline[d.timeline.length - 1].at.replace("T", " ").slice(0, 16)}</td></tr>`;
      }).join("") || `<tr><td colspan="4">No history.</td></tr>`;
  }

  const page = document.body.dataset.page;
  if (page === "customer") renderCustomer();
  if (page === "admin") renderAdmin();
  if (page === "rider") renderRider();
})();
