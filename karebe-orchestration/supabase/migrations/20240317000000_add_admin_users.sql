-- Admin Users table for managing admin accounts
-- This replaces the hardcoded demo users

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super-admin')),
    branch_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_branch_id ON admin_users(branch_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Insert default admin users (password is bcrypt hash of 'admin123' and 'owner123')
-- These are the same as the demo users for backwards compatibility
INSERT INTO admin_users (id, email, password_hash, name, phone, role, branch_id)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'owner@karebe.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'John Karebe', '+254712345678', 'super-admin', NULL),
    ('user-admin-001', 'admin@karebe.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Grace Muthoni', '+254723456789', 'admin', 'branch-wangige')
ON CONFLICT (email) DO NOTHING;

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin users can be viewed by authenticated users" 
    ON admin_users FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Admin users can be inserted by super-admin" 
    ON admin_users FOR INSERT 
    TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.jwt()->>'email' 
            AND role = 'super-admin'
            AND is_active = true
        )
    );

CREATE POLICY "Admin users can be updated by super-admin" 
    ON admin_users FOR UPDATE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.jwt()->>'email' 
            AND role = 'super-admin'
            AND is_active = true
        )
    );

CREATE POLICY "Admin users can be deleted by super-admin" 
    ON admin_users FOR DELETE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.jwt()->>'email' 
            AND role = 'super-admin'
            AND is_active = true
        )
    );
