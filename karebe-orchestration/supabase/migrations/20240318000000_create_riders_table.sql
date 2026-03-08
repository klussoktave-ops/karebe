-- Riders table for delivery management
CREATE TABLE IF NOT EXISTS riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    whatsapp_number TEXT,
    status TEXT DEFAULT 'OFFLINE' CHECK (status IN ('AVAILABLE', 'BUSY', 'OFFLINE')),
    branch_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_riders_phone ON riders(phone);
CREATE INDEX IF NOT EXISTS idx_riders_branch_id ON riders(branch_id);
CREATE INDEX IF NOT EXISTS idx_riders_status ON riders(status);

-- Insert demo riders
INSERT INTO riders (id, name, phone, whatsapp_number, status, branch_id, is_active)
VALUES 
    ('rider-001', 'John Doe', '+254712345678', '+254712345678', 'AVAILABLE', 'branch-wangige', true),
    ('rider-002', 'Jane Smith', '+254723456789', '+254723456789', 'BUSY', 'branch-kikuyu', true),
    ('rider-003', 'Mike Johnson', '+254734567890', NULL, 'OFFLINE', 'branch-githurai', true)
ON CONFLICT (phone) DO NOTHING;

-- Enable RLS
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;

-- RLS Policies - simplified for now
CREATE POLICY "Riders can be viewed by authenticated users" 
    ON riders FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Riders can be inserted by authenticated users" 
    ON riders FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Riders can be updated by authenticated users" 
    ON riders FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Riders can be deleted by authenticated users" 
    ON riders FOR DELETE 
    TO authenticated 
    USING (true);
