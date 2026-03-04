-- =============================================================================
-- Karebe Complete Schema Migration (Safe version)
-- Run this in Supabase SQL Editor - handles existing tables safely
-- =============================================================================

-- Enable UUID extension
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; END $$;

-- =============================================================================
-- Helper function to check if column exists
-- =============================================================================
DO $$ 
BEGIN
    -- =============================================================================
    -- Fix branches table - add missing columns if they don't exist
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
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'mpesa_passkey') THEN
        ALTER TABLE branches ADD COLUMN mpesa_passkey TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'mpesa_env_key') THEN
        ALTER TABLE branches ADD COLUMN mpesa_env_key TEXT;
    END IF;

    -- Insert default branch if not exists
    INSERT INTO branches (id, name, address, phone, is_main) 
    VALUES ('main-branch', 'Main Branch', '123 Main St, Nairobi', '+254712345678', true)
    ON CONFLICT (id) DO NOTHING;
    
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

    -- Insert demo rider if not exists
    INSERT INTO riders (id, full_name, phone, whatsapp_number, branch_id, is_active)
    VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        'John Rider',
        '+254700000001',
        '+254700000001',
        'main-branch',
        true
    )
    ON CONFLICT (id) DO NOTHING;
    
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
    ON orders(idempotency_key) 
    WHERE idempotency_key IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

    -- =============================================================================
    -- Create order_items table if not exists
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
    -- Create order_state_transitions table
    -- =============================================================================
    CREATE TABLE IF NOT EXISTS order_state_transitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
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
    
    CREATE INDEX IF NOT EXISTS idx_order_state_transitions_order_id 
    ON order_state_transitions(order_id);

    -- =============================================================================
    -- Create categories table if not exists
    -- =============================================================================
    CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        description TEXT,
        image_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Insert default categories
    INSERT INTO categories (id, name, slug, sort_order, is_active) VALUES
        (gen_random_uuid(), 'Wine', 'wine', 1, true),
        (gen_random_uuid(), 'Whisky', 'whisky', 2, true),
        (gen_random_uuid(), 'Vodka', 'vodka', 3, true),
        (gen_random_uuid(), 'Beer', 'beer', 4, true),
        (gen_random_uuid(), 'Soft Drink', 'soft-drink', 5, true),
        (gen_random_uuid(), 'Gin', 'gin', 6, true),
        (gen_random_uuid(), 'Rum', 'rum', 7, true),
        (gen_random_uuid(), 'Brandy', 'brandy', 8, true),
        (gen_random_uuid(), 'Tequila', 'tequila', 9, true)
    ON CONFLICT (slug) DO NOTHING;

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

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_is_visible ON products(is_visible);
    CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);

    -- =============================================================================
    -- Create product_variants table if not exists
    -- =============================================================================
    CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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
    -- Create order_locks table if not exists
    -- =============================================================================
    CREATE TABLE IF NOT EXISTS order_locks (
        order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
        admin_id UUID NOT NULL,
        session_id TEXT,
        locked_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ
    );

    -- =============================================================================
    -- Create admin_settings table if not exists
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

    -- Insert default settings
    INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
        ('default_branch_id', 'main-branch', 'Default branch for orders'),
        ('whatsapp_business_number', '+254712345678', 'WhatsApp business phone number'),
        ('support_phone', '+254712345678', 'Customer support phone number')
    ON CONFLICT (setting_key) DO NOTHING;

END $$;

-- =============================================================================
-- Success message
-- =============================================================================
SELECT 'Migration completed successfully!' as status;
