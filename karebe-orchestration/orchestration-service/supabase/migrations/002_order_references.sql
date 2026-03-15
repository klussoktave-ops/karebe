-- =============================================================================
-- Order Reference System Migration
-- Adds order_reference field and sequence tracking table
-- =============================================================================

-- Create settings table if it doesn't exist (for configurable order reference settings)
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add order_reference column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_reference VARCHAR(20) UNIQUE;

-- Create order_sequences table for tracking daily sequences
CREATE TABLE IF NOT EXISTS order_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_code VARCHAR(5) NOT NULL,
  date_key VARCHAR(10) NOT NULL,
  current_sequence INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_code, date_key)
);

-- Index for efficient sequence lookups
CREATE INDEX IF NOT EXISTS idx_order_sequences_lookup 
  ON order_sequences(branch_code, date_key);

-- Insert default settings if not exists (using app_settings table)
INSERT INTO app_settings (key, value, description) VALUES
  ('order_reference_prefix', '"KRB"', 'Prefix for order references')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, description) VALUES
  ('order_reference_min_sequence', '1', 'Minimum sequence number')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, description) VALUES
  ('order_reference_max_sequence', '999', 'Maximum sequence number')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, description) VALUES
  ('order_reference_use_day_format', 'false', 'Include day in reference')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, description) VALUES
  ('order_reference_default_branch_code', '"M"', 'Default branch code')
ON CONFLICT (key) DO NOTHING;

-- Update existing orders with order_reference if null (cast UUID to text first)
UPDATE orders 
SET order_reference = CONCAT(
  'KRB-',
  UPPER(SUBSTRING(CAST(id AS TEXT) FROM 13 FOR 6))
)
WHERE order_reference IS NULL AND id IS NOT NULL;

-- Add RLS policies for order_sequences
ALTER TABLE order_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage order sequences" 
  ON order_sequences FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Enable RLS on app_settings if not already
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" 
  ON app_settings FOR SELECT USING (true);

CREATE POLICY "Service can update settings" 
  ON app_settings FOR ALL USING (true) WITH CHECK (true);
