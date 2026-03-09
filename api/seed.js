const seed = {
  business: { name: "Karebe Wines & Spirits", phone: "+254700123456", whatsappPhone: "254700123456" },
  branches: [
    { id: "main-branch", name: "Main Branch", address: "123 Main St, Nairobi", phone: "+254712345678", is_main: true },
    { id: "westlands", name: "Westlands Branch", address: "Westlands, Nairobi", phone: "+254723456789", is_main: false }
  ],
  products: [
    { id: "p1", name: "Karebe Red Wine", category: "Wine", description: "Premium red wine", variants: [{ id: "v1", volume: "750ml", price: 2400, stock: 22 }] },
    { id: "p2", name: "Karebe White Wine", category: "Wine", description: "Crisp white wine", variants: [{ id: "v2", volume: "750ml", price: 3600, stock: 16 }, { id: "v3", volume: "1L", price: 4700, stock: 9 }] },
    { id: "p3", name: "Karebe Spirit", category: "Spirits", description: "Fine spirit", variants: [{ id: "v4", volume: "750ml", price: 1800, stock: 30 }] },
    { id: "p4", name: "House Wine", category: "Wine", description: "Affordable house wine", variants: [{ id: "v5", volume: "Per Glass", price: 80, stock: 500 }] }
  ]
};

function withoutAdminPassword(state) {
  const users = (state.users || []).map((u) => ({ ...u, password_hash: undefined }));
  return { ...state, users };
}

module.exports = async function handler(req, res) {
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  // GET: Return current seed data
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, data: seed });
  }

  // POST: Seed database
  if (req.method === "POST") {
    try {
      // Insert branches
      const { error: branchError } = await supabase.from("branches").upsert(seed.branches, { onConflict: "id" });
      if (branchError) return res.status(500).json({ ok: false, error: "Failed to seed branches: " + branchError.message });

      // Insert products
      for (const product of seed.products) {
        const { error: productError } = await supabase.from("products").upsert(product, { onConflict: "id" });
        if (productError) return res.status(500).json({ ok: false, error: "Failed to seed products: " + productError.message });
      }

      return res.status(200).json({ ok: true, message: "Database seeded successfully" });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
