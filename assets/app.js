(function () {
  const STORAGE_KEY = "karebe_state_v1";

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = JSON.parse(JSON.stringify(window.KAREBE_SEED));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  async function backendAdminLogin(username, password) {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) return false;
      const body = await res.json();
      return Boolean(body && body.ok);
    } catch (_) {
      return false;
    }
  }

  function getAllVariants(state) {
    const rows = [];
    state.products.forEach((p) => {
      p.variants.forEach((v) => rows.push({ product: p, variant: v }));
    });
    return rows;
  }

  function renderCustomer() {
    const state = loadState();
    const categorySel = document.getElementById("categoryFilter");
    const popularSel = document.getElementById("popularFilter");
    const newSel = document.getElementById("newFilter");
    const maxPrice = document.getElementById("maxPrice");
    const list = document.getElementById("products");

    categorySel.innerHTML = `<option value="">All Categories</option>${state.categories
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("")}`;

    function card(product, variant) {
      const inStock = variant.stock > 0;
      const qtyId = `qty_${product.id}_${variant.id}`;
      const smsBody = encodeURIComponent(
        `Hi ${state.business.name}, I need ${product.name} (${variant.volume}). Qty: 1. Total: ${fmtKES(
          variant.price
        )}`
      );
      return `
      <article class="card">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <div class="card-body">
          <div class="row">
            <strong>${product.name}</strong>
            <span class="badge ${inStock ? "ok" : "danger"}">${inStock ? "In Stock" : "Out"}</span>
          </div>
          <p class="small">${product.description}</p>
          <div class="row">
            <span class="badge">${product.category}</span>
            <span class="badge gold">${variant.volume}</span>
          </div>
          <div class="row" style="margin-top:8px;">
            <strong>${fmtKES(variant.price)}</strong>
            <input id="${qtyId}" type="number" min="1" value="1" style="max-width:72px;" />
          </div>
          <div class="actions" style="margin-top:8px;">
            <a class="btn" href="tel:${state.business.phone}"><button ${!inStock ? "disabled" : ""}>Order Call</button></a>
            <a href="sms:${state.business.phone}?body=${smsBody}"><button class="secondary" ${!inStock ? "disabled" : ""}>SMS</button></a>
            <a target="_blank" rel="noopener" href="https://wa.me/${state.business.whatsappPhone}?text=${smsBody}"><button class="secondary" ${!inStock ? "disabled" : ""}>WhatsApp</button></a>
          </div>
        </div>
      </article>`;
    }

    function draw() {
      const category = categorySel.value;
      const popular = popularSel.value;
      const newer = newSel.value;
      const cap = Number(maxPrice.value || 999999);
      const cards = [];
      state.products.forEach((p) => {
        if (!p.variants || !p.variants.length) return;
        const v = p.variants[0];
        if (category && p.category !== category) return;
        if (popular === "yes" && !p.popular) return;
        if (newer === "yes" && !p.newArrival) return;
        if (v.price > cap) return;
        cards.push(card(p, v));
      });
      list.innerHTML = cards.length ? cards.join("") : `<p class="small">No products match your filters.</p>`;
    }

    [categorySel, popularSel, newSel, maxPrice].forEach((el) => el.addEventListener("change", draw));
    draw();
  }

  function renderAdmin() {
    const state = loadState();
    const isAuthed = sessionStorage.getItem("karebe_admin") === "1";
    const loginWrap = document.getElementById("adminLogin");
    const appWrap = document.getElementById("adminApp");

    if (!isAuthed) {
      loginWrap.classList.remove("hidden");
      appWrap.classList.add("hidden");
      document.getElementById("adminLoginForm").onsubmit = async (e) => {
        e.preventDefault();
        const u = document.getElementById("adminUser").value.trim();
        const p = document.getElementById("adminPass").value;
        const latest = loadState();
        const backendOk = await backendAdminLogin(u, p);
        const localOk = u === latest.admin.username && p === latest.admin.password;
        if (backendOk || localOk) {
          sessionStorage.setItem("karebe_admin", "1");
          location.reload();
        } else {
          alert("Invalid credentials");
        }
      };
      return;
    }

    loginWrap.classList.add("hidden");
    appWrap.classList.remove("hidden");

    document.getElementById("adminLogout").onclick = () => {
      sessionStorage.removeItem("karebe_admin");
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
    state.orders.forEach((o) => {
      o.items.forEach((i) => {
        freq[i.productName] = (freq[i.productName] || 0) + i.qty;
      });
    });
    const top = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, qty]) => `${name} (${qty})`)
      .join(", ");
    document.getElementById("topProducts").textContent = top || "No orders yet";

    const riderPerf = state.riders
      .map((r) => {
        const done = state.deliveries.filter((d) => d.riderId === r.id && d.status === "DELIVERED").length;
        return `${r.name}: ${done}`;
      })
      .join(" | ");
    document.getElementById("riderPerformance").textContent = riderPerf || "No rider data";

    const productRows = state.products
      .map((p) => {
        const v = p.variants[0];
        return `<tr>
          <td>${p.name}</td><td>${p.category}</td><td>${v.volume}</td><td>${fmtKES(v.price)}</td><td>${v.stock}</td>
          <td><button data-act="stock" data-id="${p.id}" class="secondary">Toggle Stock</button></td>
          <td><button data-act="del" data-id="${p.id}" class="secondary">Delete</button></td>
        </tr>`;
      })
      .join("");
    document.getElementById("productsTableBody").innerHTML = productRows || `<tr><td colspan="7">No products.</td></tr>`;

    document.getElementById("productsTableBody").onclick = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id;
      const fresh = loadState();
      const p = fresh.products.find((x) => x.id === id);
      if (!p) return;
      if (btn.dataset.act === "stock") {
        p.variants.forEach((v) => {
          v.stock = v.stock > 0 ? 0 : 10;
        });
      }
      if (btn.dataset.act === "del") {
        fresh.products = fresh.products.filter((x) => x.id !== id);
      }
      saveState(fresh);
      location.reload();
    };

    const categorySel = document.getElementById("productCategory");
    categorySel.innerHTML = state.categories.map((c) => `<option value="${c}">${c}</option>`).join("");

    document.getElementById("productForm").onsubmit = (e) => {
      e.preventDefault();
      const fresh = loadState();
      const product = {
        id: uid("p"),
        name: document.getElementById("productName").value.trim(),
        category: document.getElementById("productCategory").value,
        description: document.getElementById("productDesc").value.trim(),
        image: document.getElementById("productImage").value.trim() || "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=700&q=70",
        popular: document.getElementById("productPopular").checked,
        newArrival: document.getElementById("productNew").checked,
        variants: [
          {
            id: uid("v"),
            volume: document.getElementById("productVolume").value.trim(),
            price: Number(document.getElementById("productPrice").value),
            stock: Number(document.getElementById("productStock").value)
          }
        ]
      };
      fresh.products.push(product);
      saveState(fresh);
      location.reload();
    };

    const ridersRows = state.riders
      .map((r) => `<tr><td>${r.name}</td><td>${r.phone}</td><td>${r.active ? "Active" : "Inactive"}</td></tr>`)
      .join("");
    document.getElementById("ridersTableBody").innerHTML = ridersRows || `<tr><td colspan="3">No riders.</td></tr>`;

    document.getElementById("riderForm").onsubmit = (e) => {
      e.preventDefault();
      const fresh = loadState();
      fresh.riders.push({
        id: uid("r"),
        name: document.getElementById("riderName").value.trim(),
        phone: document.getElementById("riderPhone").value.trim(),
        pin: document.getElementById("riderPin").value.trim(),
        active: true
      });
      saveState(fresh);
      location.reload();
    };

    const orderVariant = document.getElementById("orderVariant");
    orderVariant.innerHTML = variants
      .map((row) => `<option value="${row.product.id}|${row.variant.id}">${row.product.name} - ${row.variant.volume} (${fmtKES(row.variant.price)})</option>`)
      .join("");

    document.getElementById("orderForm").onsubmit = (e) => {
      e.preventDefault();
      const fresh = loadState();
      const [pId, vId] = document.getElementById("orderVariant").value.split("|");
      const qty = Number(document.getElementById("orderQty").value);
      const paymentStatus = document.getElementById("orderPayment").value;
      const customerPhone = document.getElementById("orderCustomer").value.trim();
      const prod = fresh.products.find((p) => p.id === pId);
      const variant = prod ? prod.variants.find((v) => v.id === vId) : null;
      if (!prod || !variant) return alert("Invalid product variant");
      if (variant.stock < qty) return alert("Insufficient stock");

      const total = qty * variant.price;
      variant.stock -= qty;
      const order = {
        id: uid("o"),
        customerPhone,
        source: "CALL",
        paymentStatus,
        status: "CONFIRMED",
        total,
        createdAt: nowISO(),
        createdBy: "admin",
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            variantId: variant.id,
            volume: variant.volume,
            qty,
            unitPrice: variant.price,
            lineTotal: total
          }
        ]
      };
      fresh.orders.push(order);
      saveState(fresh);
      location.reload();
    };

    const riderSel = document.getElementById("assignRider");
    riderSel.innerHTML = state.riders.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");

    const assignSel = document.getElementById("assignOrder");
    const assignedOrderIds = new Set(state.deliveries.map((d) => d.orderId));
    const assignableOrders = state.orders.filter((o) => !assignedOrderIds.has(o.id));
    assignSel.innerHTML = assignableOrders
      .map((o) => `<option value="${o.id}">${o.id} - ${fmtKES(o.total)} - ${o.customerPhone}</option>`)
      .join("");

    document.getElementById("assignForm").onsubmit = (e) => {
      e.preventDefault();
      const orderId = document.getElementById("assignOrder").value;
      const riderId = document.getElementById("assignRider").value;
      if (!orderId) return alert("No order available for assignment");
      const fresh = loadState();
      fresh.deliveries.push({
        id: uid("d"),
        orderId,
        riderId,
        status: "ASSIGNED",
        timeline: [{ status: "ASSIGNED", at: nowISO() }]
      });
      saveState(fresh);
      location.reload();
    };

    const orderRows = state.orders
      .map(
        (o) => `<tr><td>${o.id}</td><td>${o.customerPhone}</td><td>${o.items[0].productName}</td><td>${fmtKES(o.total)}</td><td>${o.paymentStatus}</td><td>${dateOnly(o.createdAt)}</td></tr>`
      )
      .join("");
    document.getElementById("ordersTableBody").innerHTML = orderRows || `<tr><td colspan="6">No orders.</td></tr>`;

    const deliveryRows = state.deliveries
      .map((d) => {
        const rider = state.riders.find((r) => r.id === d.riderId);
        const order = state.orders.find((o) => o.id === d.orderId);
        return `<tr><td>${d.id}</td><td>${rider ? rider.name : "Unknown"}</td><td>${order ? order.customerPhone : "-"}</td><td>${order ? order.items[0].productName : "-"}</td><td>${d.status}</td><td>${d.timeline[d.timeline.length - 1].at.replace("T", " ").slice(0, 16)}</td></tr>`;
      })
      .join("");
    document.getElementById("deliveriesTableBody").innerHTML = deliveryRows || `<tr><td colspan="6">No deliveries.</td></tr>`;
  }

  function renderRider() {
    const loginWrap = document.getElementById("riderLogin");
    const appWrap = document.getElementById("riderApp");
    const riderId = sessionStorage.getItem("karebe_rider_id");

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
        sessionStorage.setItem("karebe_rider_id", rider.id);
        location.reload();
      };
      return;
    }

    loginWrap.classList.add("hidden");
    appWrap.classList.remove("hidden");

    document.getElementById("riderLogout").onclick = () => {
      sessionStorage.removeItem("karebe_rider_id");
      location.reload();
    };

    const state = loadState();
    const rider = state.riders.find((r) => r.id === riderId);
    if (!rider) {
      sessionStorage.removeItem("karebe_rider_id");
      location.reload();
      return;
    }
    document.getElementById("riderNameLabel").textContent = rider.name;

    const mine = state.deliveries.filter((d) => d.riderId === riderId);
    const pending = mine.filter((d) => d.status !== "DELIVERED");

    function nextStatus(s) {
      if (s === "ASSIGNED") return "PICKED_UP";
      if (s === "PICKED_UP") return "ON_THE_WAY";
      if (s === "ON_THE_WAY") return "DELIVERED";
      return null;
    }

    const jobs = pending
      .map((d) => {
        const order = state.orders.find((o) => o.id === d.orderId);
        const ns = nextStatus(d.status);
        return `<article class="card"><div class="card-body">
          <div class="row"><strong>${d.id}</strong><span class="badge gold">${d.status}</span></div>
          <p class="small">Order: ${d.orderId} | Customer: ${order ? order.customerPhone : "-"}</p>
          <p class="small">Item: ${order ? order.items[0].productName : "-"} | Total: ${order ? fmtKES(order.total) : "-"}</p>
          ${ns ? `<button data-delivery="${d.id}" data-next="${ns}">Mark ${ns.replaceAll("_", " ")}</button>` : ""}
        </div></article>`;
      })
      .join("");

    document.getElementById("assignedJobs").innerHTML = jobs || `<p class="small">No active deliveries.</p>`;

    document.getElementById("assignedJobs").onclick = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.delivery;
      const ns = btn.dataset.next;
      const fresh = loadState();
      const d = fresh.deliveries.find((x) => x.id === id);
      if (!d) return;
      d.status = ns;
      d.timeline.push({ status: ns, at: nowISO() });
      const order = fresh.orders.find((o) => o.id === d.orderId);
      if (order && ns === "DELIVERED") {
        order.status = "COMPLETED";
      }
      saveState(fresh);
      location.reload();
    };

    const history = mine
      .map((d) => {
        const order = state.orders.find((o) => o.id === d.orderId);
        return `<tr><td>${d.id}</td><td>${order ? order.items[0].productName : "-"}</td><td>${d.status}</td><td>${d.timeline[d.timeline.length - 1].at.replace("T", " ").slice(0, 16)}</td></tr>`;
      })
      .join("");

    document.getElementById("riderHistoryBody").innerHTML = history || `<tr><td colspan="4">No history.</td></tr>`;
  }

  const page = document.body.dataset.page;
  if (page === "customer") renderCustomer();
  if (page === "admin") renderAdmin();
  if (page === "rider") renderRider();
})();
