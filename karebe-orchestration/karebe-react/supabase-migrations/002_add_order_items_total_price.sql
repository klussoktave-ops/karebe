-- Add missing total_price column to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2) NOT NULL DEFAULT 0;
