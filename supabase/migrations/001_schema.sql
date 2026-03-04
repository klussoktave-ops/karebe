-- ============================================================
-- Karebe Schema - Fixed version
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ENUMS
create type user_role as enum ('customer', 'admin', 'super-admin', 'rider');
create type order_status as enum ('pending', 'confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled');
create type payment_method as enum ('MPESA_DARAJA', 'MPESA_PAYBILL', 'CASH', 'CARD');
create type delivery_channel as enum ('PICKUP', 'DELIVERY', 'WHATSAPP', 'CALL', 'SMS');
create type delivery_status as enum ('assigned', 'in_progress', 'completed', 'cancelled');

-- TABLE: users
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  role user_role not null default 'customer',
  name text not null,
  email text unique,
  phone text unique,
  username text unique,
  password text,
  branch_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- TABLE: branches
create table if not exists branches (
  id text primary key,
  name text not null,
  is_main boolean not null default false,
  location text,
  phone text,
  lat double precision,
  lng double precision,
  operating_hours jsonb,
  created_at timestamptz not null default now()
);

-- TABLE: categories
create table if not exists categories (
  id text primary key,
  name text not null,
  slug text unique,
  description text,
  image text,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

-- TABLE: products
create table if not exists products (
  id text primary key,
  name text not null,
  description text,
  category_id text references categories(id),
  image text,
  images jsonb default '[]',
  price numeric(12,2) default 0,
  compare_price numeric(12,2),
  stock_quantity int default 0,
  is_available boolean default true,
  is_visible boolean default true,
  is_featured boolean default false,
  tags jsonb default '[]',
  branch_id text references branches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TABLE: product_variants
create table if not exists product_variants (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  volume text not null,
  price numeric(12,2) not null,
  compare_price numeric(12,2),
  stock int default 0,
  sku text,
  is_default boolean default false,
  created_at timestamptz not null default now()
);

-- TABLE: cart_items
create table if not exists cart_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  product_id text references products(id) on delete cascade,
  variant_id text references product_variants(id) on delete cascade,
  quantity int not null check (quantity > 0),
  branch_id text references branches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, variant_id)
);

-- TABLE: orders
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  customer_phone text,
  customer_name text,
  total numeric(12,2) not null default 0,
  status order_status not null default 'pending',
  payment_method payment_method not null default 'CASH',
  payment_status text not null default 'PENDING',
  delivery_channel delivery_channel not null default 'PICKUP',
  delivery_address text,
  delivery_notes text,
  branch_id text references branches(id),
  source text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TABLE: order_items
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id text not null,
  product_name text,
  variant_id text,
  volume text,
  quantity int not null check (quantity > 0),
  price numeric(12,2) not null,
  line_total numeric(12,2) generated always as (quantity * price) stored
);

-- TABLE: delivery_assignments
create table if not exists delivery_assignments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  rider_id text not null,
  status delivery_status not null default 'assigned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);

-- TABLE: tills
create table if not exists tills (
  id text primary key,
  branch_id text not null references branches(id),
  type text not null default 'BUY_GOODS',
  till_number text not null,
  business_short_code text,
  account_reference text,
  active boolean not null default true
);

-- INDEXES
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_product_variants_product on product_variants(product_id);
create index if not exists idx_cart_user on cart_items(user_id);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_items_order on order_items(order_id);

-- Enable RLS
alter table users enable row level security;
alter table branches enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table delivery_assignments enable row level security;
alter table tills enable row level security;

-- RLS Policies - Public read for storefront
create policy "public_products" on products for select using (is_visible = true);
create policy "public_categories" on categories for select using (true);
create policy "public_branches" on branches for select using (true);
create policy "public_product_variants" on product_variants for select using (true);

-- Admin policies
create policy "admin_all" on products for all using (true);
create policy "admin_all_categories" on categories for all using (true);
create policy "admin_all_branches" on branches for all using (true);
create policy "admin_all_variants" on product_variants for all using (true);
create policy "admin_all_cart" on cart_items for all using (true);
create policy "admin_all_orders" on orders for all using (true);
create policy "admin_all_order_items" on order_items for all using (true);
create policy "admin_all_delivery" on delivery_assignments for all using (true);
create policy "admin_all_tills" on tills for all using (true);
create policy "admin_all_users" on users for all using (true);
