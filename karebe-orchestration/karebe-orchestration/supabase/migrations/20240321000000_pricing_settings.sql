-- =============================================================================
-- Pricing Settings and Delivery Zones Schema
-- Adds configurable pricing and distance-based delivery fees
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: pricing_settings
-- Stores global pricing configuration
-- =============================================================================
CREATE TABLE IF NOT EXISTS pricing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pricing_settings_key ON pricing_settings(key);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_active ON pricing_settings(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- TABLE: delivery_zones
-- Stores distance-based delivery pricing tiers
-- =============================================================================
CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    branch_id TEXT REFERENCES branches(id),
    min_distance_km DECIMAL(6,2) NOT NULL,
    max_distance_km DECIMAL(6,2) NOT NULL,
    fee DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for zone lookups
CREATE INDEX IF NOT EXISTS idx_delivery_zones_branch ON delivery_zones(branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_delivery_zones_distance ON delivery_zones(min_distance_km, max_distance_km);

-- =============================================================================
-- TABLE: delivery_zone_areas
-- Stores specific areas/locations within zones (for manual assignment)
-- =============================================================================
CREATE TABLE IF NOT EXISTS delivery_zone_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES delivery_zones(id) ON DELETE CASCADE,
    area_name VARCHAR(200) NOT NULL,
    area_type VARCHAR(50) DEFAULT 'neighborhood', -- neighborhood, estate, suburb, city
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_zone_areas_zone ON delivery_zone_areas(zone_id);

-- =============================================================================
-- Add columns to orders table for delivery fee tracking
-- =============================================================================
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_zone_id UUID REFERENCES delivery_zones(id),
ADD COLUMN IF NOT EXISTS distance_km DECIMAL(6,2);

-- =============================================================================
-- Seed default pricing settings
-- =============================================================================
INSERT INTO pricing_settings (key, value, description) VALUES
    ('base_delivery_fee', '{"amount": 300, "currency": "KES"}', 'Base fee for standard delivery'),
    ('free_delivery_threshold', '{"amount": 5000, "currency": "KES"}', 'Order total above which delivery is free'),
    ('vat_rate', '{"rate": 0.16, "name": "VAT"}', 'Value Added Tax rate'),
    ('min_order_amount', '{"amount": 0, "currency": "KES"}', 'Minimum order amount'),
    ('max_delivery_distance', '{"distance": 15, "unit": "km"}', 'Maximum delivery distance')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Seed default delivery zones
-- =============================================================================
INSERT INTO delivery_zones (name, min_distance_km, max_distance_km, fee, sort_order, is_active) VALUES
    ('Zone A - Very Close', 0, 2, 150, 1, TRUE),
    ('Zone B - Close', 2, 5, 300, 2, TRUE),
    ('Zone C - Medium', 5, 10, 500, 3, TRUE),
    ('Zone D - Far', 10, 15, 800, 4, TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Function to get delivery fee by distance
-- =============================================================================
CREATE OR REPLACE FUNCTION get_delivery_fee_by_distance(p_distance_km DECIMAL(6,2))
RETURNS TABLE(
    zone_id UUID,
    zone_name VARCHAR(100),
    fee DECIMAL(10,2),
    is_free_delivery BOOLEAN,
    threshold_amount DECIMAL(10,2)
) AS $$
DECLARE
    v_zone RECORD;
    v_settings RECORD;
    v_subtotal DECIMAL(10,2) := 0;
BEGIN
    -- Get active pricing settings
    SELECT value->>'amount' AS threshold INTO v_settings
    FROM pricing_settings 
    WHERE key = 'free_delivery_threshold' AND is_active = TRUE;

    -- Find the applicable zone
    SELECT id, name, fee INTO v_zone
    FROM delivery_zones
    WHERE is_active = TRUE
      AND p_distance_km >= min_distance_km 
      AND p_distance_km < max_distance_km
    ORDER BY sort_order ASC
    LIMIT 1;

    -- If no zone found, return null
    IF v_zone IS NULL THEN
        RETURN;
    END IF;

    -- Return the result
    RETURN QUERY SELECT 
        v_zone.id,
        v_zone.name,
        v_zone.fee,
        FALSE,
        COALESCE(v_settings.threshold::DECIMAL(10,2), 5000);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function to calculate order total with delivery and tax
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_order_totals(
    p_subtotal DECIMAL(10,2),
    p_distance_km DECIMAL(6,2)
) RETURNS TABLE(
    subtotal DECIMAL(10,2),
    vat_amount DECIMAL(10,2),
    delivery_fee DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    free_delivery BOOLEAN,
    zone_name VARCHAR(100)
) AS $$
DECLARE
    v_settings RECORD;
    v_zone RECORD;
    v_vat_rate DECIMAL(5,4);
    v_free_threshold DECIMAL(10,2);
    v_base_fee DECIMAL(10,2);
BEGIN
    -- Get pricing settings
    SELECT value->>'rate' AS rate INTO v_vat_rate
    FROM pricing_settings WHERE key = 'vat_rate' AND is_active = TRUE;
    
    SELECT value->>'amount' AS threshold INTO v_free_threshold
    FROM pricing_settings WHERE key = 'free_delivery_threshold' AND is_active = TRUE;
    
    SELECT value->>'amount' AS fee INTO v_base_fee
    FROM pricing_settings WHERE key = 'base_delivery_fee' AND is_active = TRUE;

    -- Set defaults if not found
    v_vat_rate := COALESCE(v_vat_rate::DECIMAL(5,4), 0.16);
    v_free_threshold := COALESCE(v_free_threshold::DECIMAL(10,2), 5000);
    v_base_fee := COALESCE(v_base_fee::DECIMAL(10,2), 300);

    -- Calculate VAT
    vat_amount := ROUND(p_subtotal * v_vat_rate, 2);

    -- Get delivery zone fee
    IF p_distance_km IS NOT NULL AND p_distance_km > 0 THEN
        SELECT zone_name, fee INTO v_zone
        FROM get_delivery_fee_by_distance(p_distance_km);
    END IF;

    -- If no zone found, use base fee
    delivery_fee := COALESCE(v_zone.fee, v_base_fee);

    -- Check for free delivery
    free_delivery := p_subtotal >= v_free_threshold;
    IF free_delivery THEN
        delivery_fee := 0;
    END IF;

    -- Calculate total
    total_amount := p_subtotal + vat_amount + delivery_fee;

    RETURN QUERY SELECT 
        p_subtotal,
        vat_amount,
        delivery_fee,
        total_amount,
        free_delivery,
        COALESCE(v_zone.zone_name, 'Standard Delivery');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;