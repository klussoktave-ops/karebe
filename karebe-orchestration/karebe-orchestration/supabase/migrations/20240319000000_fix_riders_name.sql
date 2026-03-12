-- Simple fix: Add name column to riders and insert demo data
ALTER TABLE riders ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update name from phone where name is null
UPDATE riders SET name = phone WHERE name IS NULL OR name = '';

-- Insert demo riders
INSERT INTO riders (name, phone, whatsapp_number, status, branch_id, is_active)
VALUES 
    ('John Doe', '+254712345678', '+254712345678', 'AVAILABLE', 'branch-wangige', true),
    ('Jane Smith', '+254723456789', '+254723456789', 'BUSY', 'branch-kikuyu', true),
    ('Mike Johnson', '+254734567890', NULL, 'OFFLINE', 'branch-githurai', true)
ON CONFLICT (phone) DO NOTHING;
