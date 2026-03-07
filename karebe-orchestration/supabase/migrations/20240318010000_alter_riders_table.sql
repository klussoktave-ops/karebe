-- Alter existing riders table to add missing columns

-- Add name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'name') THEN
        ALTER TABLE riders ADD COLUMN name TEXT;
    END IF;
END $$;

-- Add whatsapp_number column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'whatsapp_number') THEN
        ALTER TABLE riders ADD COLUMN whatsapp_number TEXT;
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'is_active') THEN
        ALTER TABLE riders ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'updated_at') THEN
        ALTER TABLE riders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Update existing riders to have name if missing
UPDATE riders SET name = phone WHERE name IS NULL OR name = '';

-- Insert demo riders (will not fail if they exist)
INSERT INTO riders (name, phone, whatsapp_number, status, branch_id, is_active)
VALUES 
    ('John Doe', '+254712345678', '+254712345678', 'AVAILABLE', 'branch-wangige', true),
    ('Jane Smith', '+254723456789', '+254723456789', 'BUSY', 'branch-kikuyu', true),
    ('Mike Johnson', '+254734567890', NULL, 'OFFLINE', 'branch-githurai', true)
ON CONFLICT (phone) DO NOTHING;
