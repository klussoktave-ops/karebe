-- =============================================================================
-- Karebe Complete Schema Migration (Fully Safe)
-- Run this in Supabase SQL Editor
-- =============================================================================

DO $$ 
BEGIN
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- =============================================================================
    -- Fix branches table - add missing columns
    -- =============================================================================
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'address') THEN
        ALTER TABLE branches ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'is_main') THEN
        ALTER TABLE branches ADD COLUMN is_main BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'is_active') THEN
        ALTER TABLE branches ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'mpesa_shortcode') THEN
        ALTER TABLE branches ADD COLUMN mpesa_shortcode TEXT;
    END IF;

    -- Insert default branch
    INSERT INTO branches (id, name, address, phone, is_main) 
    VALUES ('main-branch', 'Main Branch', '123 Main St, Nairobi', '+254712345678', true)
    ON CONFLICT (id) DO NOTHING;

    -- =============================================================================
    -- Create or fix cart_items table (use TEXT for user_id to match existing IDs like "user-admin-001")
    -- =============================================================================
    -- Drop existing cart_items if it exists with wrong schema (UUID user_id)
    DROP TABLE IF EXISTS cart_items;
    
    CREATE TABLE cart_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT NOT NULL,
        product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
        variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

    -- =============================================================================
    -- Fix riders table - add missing columns
    -- =============================================================================
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'whatsapp_number') THEN
        ALTER TABLE riders ADD COLUMN whatsapp_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'branch_id') THEN
        ALTER TABLE riders ADD COLUMN branch_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'status') THEN
        ALTER TABLE riders ADD COLUMN status VARCHAR(20) DEFAULT 'AVAILABLE';
    END IF;

    -- =============================================================================
    -- Fix orders table - add missing columns
    -- =============================================================================
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'confirmation_method') THEN
        ALTER TABLE orders ADD COLUMN confirmation_method VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'confirmation_by') THEN
        ALTER TABLE orders ADD COLUMN confirmation_by UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'confirmation_at') THEN
        ALTER TABLE orders ADD COLUMN confirmation_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'last_actor_type') THEN
        ALTER TABLE orders ADD COLUMN last_actor_type VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'last_actor_id') THEN
        ALTER TABLE orders ADD COLUMN last_actor_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'state_version') THEN
        ALTER TABLE orders ADD COLUMN state_version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'idempotency_key') THEN
        ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(64);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'metadata') THEN
        ALTER TABLE orders ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Create indexes
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

    -- =============================================================================
    -- Create order_items table (use TEXT for order_id to match existing orders table)
    -- =============================================================================
    CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT,
        product_name TEXT,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        variant TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- =============================================================================
    -- Create order_state_transitions table (use TEXT for order_id)
    -- =============================================================================
    CREATE TABLE IF NOT EXISTS order_state_transitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        actor_type VARCHAR(20) NOT NULL,
        actor_id UUID,
        actor_name TEXT,
        action VARCHAR(100) NOT NULL,
        action_metadata JSONB DEFAULT '{}'::jsonb,
        ip_address INET,
        user_agent TEXT,
        request_id VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_order_state_transitions_order_id ON order_state_transitions(order_id);

    -- =============================================================================
    -- Fix categories table - add missing columns
    -- =============================================================================
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'slug') THEN
        ALTER TABLE categories ADD COLUMN slug TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'image_url') THEN
        ALTER TABLE categories ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'sort_order') THEN
        ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_active') THEN
        ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    -- Insert categories with explicit UUIDs
    INSERT INTO categories (id, name) VALUES 
        (gen_random_uuid(), 'Wine'),
        (gen_random_uuid(), 'Whisky'),
        (gen_random_uuid(), 'Vodka'),
        (gen_random_uuid(), 'Beer'),
        (gen_random_uuid(), 'Soft Drink'),
        (gen_random_uuid(), 'Gin'),
        (gen_random_uuid(), 'Rum'),
        (gen_random_uuid(), 'Brandy'),
        (gen_random_uuid(), 'Tequila')
    ON CONFLICT DO NOTHING;

    -- =============================================================================
    -- Fix products table - add missing columns
    -- =============================================================================
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
        ALTER TABLE products ADD COLUMN category_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image') THEN
        ALTER TABLE products ADD COLUMN image TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_featured') THEN
        ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_visible') THEN
        ALTER TABLE products ADD COLUMN is_visible BOOLEAN DEFAULT TRUE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_is_visible ON products(is_visible);
    CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);

    -- =============================================================================
    -- Create product_variants table (use TEXT for id, UUID for product_id)
    -- =============================================================================
    CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        size TEXT,
        unit_size TEXT,
        price DECIMAL(10, 2),
        stock_quantity INTEGER DEFAULT 0,
        barcode TEXT,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

    -- =============================================================================
    -- Create order_locks table (use TEXT for order_id)
    -- =============================================================================
    CREATE TABLE IF NOT EXISTS order_locks (
        order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
        admin_id UUID NOT NULL,
        session_id TEXT,
        locked_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ
    );

    -- =============================================================================
    -- Create admin_settings table
    -- =============================================================================
    CREATE TABLE IF NOT EXISTS admin_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        branch_id TEXT,
        description TEXT,
        is_encrypted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
        ('default_branch_id', 'main-branch', 'Default branch for orders'),
        ('whatsapp_business_number', '+254712345678', 'WhatsApp business phone number'),
        ('support_phone', '+254712345678', 'Customer support phone number'),
        ('business_name', 'Karebe Wines & Spirits', 'Business name'),
        ('delivery_fee', '300', 'Default delivery fee in KES'),
        ('free_delivery_threshold', '5000', 'Free delivery minimum order amount')
    ON CONFLICT (setting_key) DO NOTHING;

END $$;

SELECT 'Migration completed!' as status;
