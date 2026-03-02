-- ============================================================
-- seed.sql — Karebe initial data for normalized tables
-- Matches existing _seed.js / data/seed.js
-- ============================================================

-- Branches
insert into branches (id, name, is_main, location, phone, on_shift_user_id) values
  ('b_wangige', 'Wangige', true,  'Wangige (Main Branch)', '+254701111111', 'u_wangige_admin'),
  ('b_karura',  'Karura',  false, 'Karura',               '+254702222222', 'u_karura_admin')
on conflict (id) do nothing;

-- Tills
insert into tills (id, branch_id, type, till_number, business_short_code, account_reference, active) values
  ('till_wangige', 'b_wangige', 'BUY_GOODS', '5132456', '174379', 'KAREBE-WANGIGE', true),
  ('till_karura',  'b_karura',  'BUY_GOODS', '5132457', '174379', 'KAREBE-KARURA',  true)
on conflict (id) do nothing;

-- Products (variants stored as jsonb)
insert into products (id, name, description, category, image, popular, new_arrival, variants) values
  (
    'p1', 'Nederburg Cabernet',
    'Dry red wine with bold berry notes.',
    'Wine',
    'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=700&q=70',
    true, false,
    '[{"id":"v1","volume":"750ml","price":2400,"stock":22}]'::jsonb
  ),
  (
    'p2', 'Jameson Irish Whiskey',
    'Smooth triple-distilled classic.',
    'Whiskey',
    'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=700&q=70',
    true, true,
    '[{"id":"v2","volume":"750ml","price":3600,"stock":16},{"id":"v3","volume":"1L","price":4700,"stock":9}]'::jsonb
  ),
  (
    'p3', 'Smirnoff Red',
    'Neutral spirit for easy mixing.',
    'Vodka',
    'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg?auto=compress&cs=tinysrgb&w=800',
    false, false,
    '[{"id":"v4","volume":"750ml","price":1800,"stock":30}]'::jsonb
  ),
  (
    'p4', 'Keg Beer',
    'Freshly tapped keg, perfect for chill sessions.',
    'Keg',
    'https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg?auto=compress&cs=tinysrgb&w=800',
    true, true,
    '[{"id":"v5","volume":"Per Glass","price":80,"stock":500}]'::jsonb
  )
on conflict (id) do nothing;

-- Admin/Rider users (password hashes are plaintext here for seed dev only — update before prod)
-- Riders use 'rider' role; store their legacy pin as the pin column
-- NOTE: In production, use Supabase Auth for users. This seed is for the users table only.
insert into users (id, role, name, username, password, phone, branch_id, active) values
  (
    uuid_nil(),  -- placeholder; real auth creates UUID from supabase.auth.users
    'super-admin'::user_role, 'Karebe Owner', 'karebe-owner', 'karebeowner1234',
    '+254700123456', null, true
  )
on conflict do nothing;

-- Seed a known order (for QA smoke tests)
-- NOTE: This order is inserted without a user_id (walk-in scenario)
-- fn_auto_order_items will NOT fire because no cart_items exist for a null user_id
-- so we manually insert order_items below.

-- For a clean seed, we skip seeding an order here and rely on the application
-- to create orders through the Edge Function checkout flow.
-- Uncomment if you want a fixed seed order for dashboard testing:

/*
insert into orders (id, customer_phone, total, status, payment_method, delivery_channel, branch_id, source, created_by)
values (
  'a0000000-0000-0000-0000-000000000001',
  '+254712111222', 2040, 'confirmed', 'MPESA_DARAJA', 'WHATSAPP', 'b_wangige', 'WHATSAPP', 'karebe'
)
on conflict (id) do nothing;

insert into order_items (order_id, product_id, product_name, variant_id, volume, quantity, price) values
  ('a0000000-0000-0000-0000-000000000001', 'p4', 'Keg Beer',     'v5', 'Per Glass', 3,  80),
  ('a0000000-0000-0000-0000-000000000001', 'p3', 'Smirnoff Red', 'v4', '750ml',     1, 1800)
on conflict do nothing;
*/
