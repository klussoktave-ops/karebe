-- =============================================================================
-- Fix: Add DELIVERED to order_status enum
-- This fixes the error: "invalid input value for enum order_status: DELIVERED"
-- =============================================================================

-- First, add DELIVERED to the enum type (PostgreSQL allows this)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'DELIVERED';

-- Note: If the above fails due to existing data, we need to handle that differently
-- The alternative is to change the column to VARCHAR and add a CHECK constraint
