-- =============================================================================
-- Soft Delete for Orders
-- Adds deleted_at and deleted_by columns to enable soft delete functionality
-- =============================================================================

-- Add soft delete columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID; -- Note: No FK constraint to avoid demo user issues

-- Create index for faster deleted orders queries
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create index for soft delete lookups
CREATE INDEX IF NOT EXISTS idx_orders_deleted_by ON orders(deleted_by) WHERE deleted_by IS NOT NULL;