-- ============================================================
-- 001_schema.sql — Karebe normalized schema with RLS
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role        as enum ('customer', 'admin', 'super-admin', 'rider');
create type order_status     as enum ('pending', 'confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled');
create type payment_method   as enum ('MPESA_DARAJA', 'MPESA_PAYBILL', 'CASH', 'CARD');
create type delivery_channel as enum ('PICKUP', 'DELIVERY', 'WHATSAPP', 'CALL', 'SMS');
create type delivery_status  as enum ('assigned', 'in_progress', 'completed', 'cancelled');
create type notification_type as enum (
  'cart_total_updated',
  'order_created',
  'order_status_updated',
  'delivery_assigned',
  'delivery_status_updated',
  'stock_low',
  'product_added'
);

-- ============================================================
-- TABLE: users
-- ============================================================
create table if not exists users (
  id          uuid          primary key default uuid_generate_v4(),
  role        user_role     not null default 'customer',
  name        text          not null,
  email       text          unique,
  phone       text          unique,
  username    text          unique,
  password    text,                          -- hashed; only for admin/rider local auth
  pin         text,                          -- hashed; only for rider PIN auth
  branch_id   text,                          -- references branches(id) — text FK for seed compat
  active      boolean       not null default true,
  created_at  timestamptz   not null default now()
);

-- ============================================================
-- TABLE: branches
-- ============================================================
create table if not exists branches (
  id                text        primary key,
  name              text        not null,
  is_main           boolean     not null default false,
  location          text,
  phone             text,
  on_shift_user_id  text,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- TABLE: tills
-- ============================================================
create table if not exists tills (
  id                  text        primary key,
  branch_id           text        not null references branches(id),
  type                text        not null default 'BUY_GOODS',
  till_number         text        not null,
  business_short_code text,
  account_reference   text,
  active              boolean     not null default true
);

-- ============================================================
-- TABLE: products
-- (variants stored as jsonb: [{id, volume, price, stock}])
-- (media stored as jsonb:    [{url, type}])
-- ============================================================
create table if not exists products (
  id           text          primary key default 'p_' || replace(gen_random_uuid()::text, '-', ''),
  name         text          not null,
  description  text,
  category     text          not null,
  image        text,
  variants     jsonb         not null default '[]',
  media        jsonb         not null default '[]',
  popular      boolean       not null default false,
  new_arrival  boolean       not null default false,
  branch_id    text          references branches(id),   -- null = all branches
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

-- ============================================================
-- TABLE: cart_items
-- ============================================================
create table if not exists cart_items (
  id          uuid          primary key default uuid_generate_v4(),
  user_id     uuid          not null references users(id) on delete cascade,
  product_id  text          not null references products(id) on delete cascade,
  variant_id  text          not null,
  quantity    int           not null check (quantity > 0),
  branch_id   text          references branches(id),
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now(),
  unique (user_id, product_id, variant_id)
);

-- ============================================================
-- TABLE: orders
-- ============================================================
create table if not exists orders (
  id               uuid            primary key default uuid_generate_v4(),
  user_id          uuid            references users(id) on delete set null,
  customer_phone   text,
  total            numeric(12, 2)  not null default 0,
  status           order_status    not null default 'pending',
  payment_method   payment_method  not null default 'CASH',
  payment_status   text            not null default 'PENDING',
  delivery_channel delivery_channel not null default 'PICKUP',
  branch_id        text            references branches(id),
  source           text,                              -- WHATSAPP | CALL | WALK_IN ...
  created_by       text,                              -- admin username who created
  created_at       timestamptz     not null default now(),
  updated_at       timestamptz     not null default now()
);

-- ============================================================
-- TABLE: order_items
-- ============================================================
create table if not exists order_items (
  id          uuid          primary key default uuid_generate_v4(),
  order_id    uuid          not null references orders(id) on delete cascade,
  product_id  text          not null,
  product_name text,
  variant_id  text          not null,
  volume      text,
  quantity    int           not null check (quantity > 0),
  price       numeric(12,2) not null check (price >= 0),
  line_total  numeric(12,2) generated always as (quantity * price) stored
);

-- ============================================================
-- TABLE: delivery_assignments
-- ============================================================
create table if not exists delivery_assignments (
  id          uuid            primary key default uuid_generate_v4(),
  order_id    uuid            not null references orders(id) on delete cascade,
  rider_id    text            not null,              -- references users(id) text pending full auth
  status      delivery_status not null default 'assigned',
  notes       text,
  created_at  timestamptz     not null default now(),
  updated_at  timestamptz     not null default now(),
  unique (order_id)                                  -- one active assignment per order
);

-- ============================================================
-- TABLE: notifications
-- ============================================================
create table if not exists notifications (
  id          uuid              primary key default uuid_generate_v4(),
  user_id     uuid              references users(id) on delete cascade,
  role        user_role,                             -- broadcast to a role (nullable = specific user)
  type        notification_type not null,
  title       text,
  message     text              not null,
  payload     jsonb             not null default '{}',
  read        boolean           not null default false,
  created_at  timestamptz       not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_cart_user        on cart_items (user_id);
create index if not exists idx_orders_user      on orders (user_id);
create index if not exists idx_orders_status    on orders (status);
create index if not exists idx_orders_branch    on orders (branch_id);
create index if not exists idx_order_items_ord  on order_items (order_id);
create index if not exists idx_delivery_rider   on delivery_assignments (rider_id);
create index if not exists idx_notif_user       on notifications (user_id, read);
create index if not exists idx_notif_role       on notifications (role, read);
create index if not exists idx_products_cat     on products (category);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table users               enable row level security;
alter table products            enable row level security;
alter table cart_items          enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table delivery_assignments enable row level security;
alter table notifications       enable row level security;
alter table branches            enable row level security;
alter table tills               enable row level security;

-- Branches: public read
create policy "branches_public_read"  on branches for select using (true);
create policy "branches_admin_write"  on branches for all
  using (auth.jwt() ->> 'role' in ('admin', 'super-admin'));

-- Products: public read
create policy "products_public_read"  on products for select using (true);
create policy "products_admin_write"  on products for all
  using (auth.jwt() ->> 'role' in ('admin', 'super-admin'));

-- Users: own row read; admin see all
create policy "users_own_read"        on users for select
  using (auth.uid() = id or auth.jwt() ->> 'role' in ('admin', 'super-admin'));
create policy "users_own_update"      on users for update
  using (auth.uid() = id);

-- Cart: own rows only
create policy "cart_own"              on cart_items for all
  using (auth.uid() = user_id);

-- Orders: customer sees own; admin sees all
create policy "orders_customer_read"  on orders for select
  using (auth.uid() = user_id or auth.jwt() ->> 'role' in ('admin', 'super-admin'));
create policy "orders_admin_write"    on orders for all
  using (auth.jwt() ->> 'role' in ('admin', 'super-admin'));
create policy "orders_customer_insert" on orders for insert
  with check (auth.uid() = user_id);

-- Order items: derived from order RLS via join
create policy "order_items_read"      on order_items for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or auth.jwt() ->> 'role' in ('admin', 'super-admin'))
    )
  );

-- Delivery: rider sees own; admin sees all
create policy "delivery_rider_read"   on delivery_assignments for select
  using (
    rider_id = auth.uid()::text
    or auth.jwt() ->> 'role' in ('admin', 'super-admin')
  );
create policy "delivery_admin_write"  on delivery_assignments for all
  using (auth.jwt() ->> 'role' in ('admin', 'super-admin'));
create policy "delivery_rider_update" on delivery_assignments for update
  using (rider_id = auth.uid()::text);

-- Notifications: own or matching role
create policy "notif_own_read"        on notifications for select
  using (
    user_id = auth.uid()
    or role::text = auth.jwt() ->> 'role'
  );

-- Tills: admin only
create policy "tills_admin"           on tills for all
  using (auth.jwt() ->> 'role' in ('admin', 'super-admin'));
