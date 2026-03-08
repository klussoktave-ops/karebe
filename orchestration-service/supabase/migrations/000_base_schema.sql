-- =============================================================================
-- Base Schema for Karebe Orchestration Service
-- Creates minimal tables needed before orchestration schema
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: branches
-- =============================================================================
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TABLE: riders
-- =============================================================================
CREATE TABLE IF NOT EXISTS riders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  full_name TEXT NOT NULL,
  phone TEXT,
  whatsapp_number TEXT,
  branch_id TEXT REFERENCES branches(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TABLE: orders
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(50) DEFAULT 'CART_DRAFT',
  customer_phone TEXT,
  customer_name TEXT,
  customer_email TEXT,
  delivery_address TEXT,
  delivery_notes TEXT,
  branch_id TEXT REFERENCES branches(id),
  rider_id UUID REFERENCES riders(id),
  total_amount DECIMAL(10, 2) DEFAULT 0,
  confirmation_method VARCHAR(20),
  confirmation_by UUID,
  confirmation_at TIMESTAMPTZ,
  last_actor_type VARCHAR(20),
  last_actor_id UUID,
  state_version INTEGER DEFAULT 1,
  idempotency_key VARCHAR(64),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
ON orders(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- =============================================================================
-- TABLE: order_items
-- =============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  variant TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TABLE: profiles (for auth users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  role VARCHAR(20) DEFAULT 'customer',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default branch
INSERT INTO branches (id, name, address, phone) 
VALUES ('main-branch', 'Main Branch', '123 Main St, Nairobi', '+254712345678')
ON CONFLICT DO NOTHING;

-- Insert demo rider
INSERT INTO riders (id, full_name, phone, whatsapp_number, branch_id, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'John Rider',
  '+254798765432',
  '+254798765432',
  'main-branch',
  TRUE
)
ON CONFLICT DO NOTHING;

-- Insert demo admin profile
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'admin@karebe.com',
  'admin',
  'Admin User'
)
ON CONFLICT DO NOTHING;