-- =============================================================================
-- Karebe Orchestration Service - Database Schema
-- Hybrid WhatsApp-First Order Management System
-- =============================================================================

-- =============================================================================
-- PART 1: ORDER STATE MACHINE EXTENSIONS
-- =============================================================================

-- Extend orders table with state machine fields
ALTER TABLE IF EXISTS orders 
ADD COLUMN IF NOT EXISTS confirmation_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS confirmation_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS confirmation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_actor_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS last_actor_id UUID,
ADD COLUMN IF NOT EXISTS state_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create unique constraint on idempotency key to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key 
ON orders(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- =============================================================================
-- PART 2: ORDER STATE TRANSITION LOG (Audit Trail)
-- =============================================================================

CREATE TABLE IF NOT EXISTS order_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- State information
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  
  -- Actor information
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('customer', 'admin', 'rider', 'system', 'webhook')),
  actor_id UUID,
  actor_name TEXT,
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  action_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Technical tracking
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(64),
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_status_transition CHECK (previous_status IS NULL OR previous_status != new_status)
);

-- Indexes for order_state_transitions
CREATE INDEX IF NOT EXISTS idx_state_transitions_order_id ON order_state_transitions(order_id);
CREATE INDEX IF NOT EXISTS idx_state_transitions_created_at ON order_state_transitions(created_at);
CREATE INDEX IF NOT EXISTS idx_state_transitions_actor ON order_state_transitions(actor_type, actor_id);

-- =============================================================================
-- PART 3: RIDER AVAILABILITY & ASSIGNMENT TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS rider_availability (
  rider_id UUID PRIMARY KEY REFERENCES riders(id) ON DELETE CASCADE,
  
  -- Availability status
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' 
    CHECK (status IN ('AVAILABLE', 'ON_DELIVERY', 'OFF_DUTY', 'BREAK')),
  
  -- Current assignment
  current_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Contact information (cached for quick access)
  phone_number TEXT,
  whatsapp_number TEXT,
  
  -- Location (optional, for future use)
  -- last_location GEOGRAPHY(POINT, 4326), -- requires PostGIS extension
  location_updated_at TIMESTAMPTZ,
  
  -- Statistics
  total_deliveries INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 5.0,
  
  -- Timestamps
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rider_availability
CREATE INDEX IF NOT EXISTS idx_rider_availability_status ON rider_availability(status) 
WHERE status = 'AVAILABLE';
CREATE INDEX IF NOT EXISTS idx_rider_availability_order ON rider_availability(current_order_id) 
WHERE current_order_id IS NOT NULL;

-- =============================================================================
-- PART 4: ORDER LOCKS (Race Condition Prevention)
-- =============================================================================

CREATE TABLE IF NOT EXISTS order_locks (
  order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  locked_by UUID NOT NULL REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  lock_reason VARCHAR(100),
  session_id VARCHAR(64)
);

-- Auto-expire locks
CREATE INDEX IF NOT EXISTS idx_order_locks_expires ON order_locks(expires_at);

-- Function to clean expired locks
CREATE OR REPLACE FUNCTION clean_expired_order_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM order_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 5: WEBHOOK EVENT LOG (Idempotency & Debugging)
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  event_id VARCHAR(64) NOT NULL UNIQUE,
  event_type VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'mautrix', 'manual', 'system'
  
  -- Payload
  payload JSONB NOT NULL,
  
  -- Processing status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'ignored')),
  
  -- Processing details
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Result
  resulting_order_id UUID REFERENCES orders(id),
  resulting_action VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order ON webhook_events(resulting_order_id) WHERE resulting_order_id IS NOT NULL;

-- =============================================================================
-- PART 6: DISPATCH QUEUE (For future auto-dispatch feature)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dispatch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Queue status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'assigned', 'timeout', 'failed')),
  
  -- Assignment tracking
  assigned_rider_id UUID REFERENCES riders(id),
  assigned_at TIMESTAMPTZ,
  
  -- Timeout handling
  timeout_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 0, -- Higher = more urgent
  
  -- Attempt tracking
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_queue_status ON dispatch_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_timeout ON dispatch_queue(timeout_at) WHERE status = 'pending';

-- =============================================================================
-- PART 7: ORDER VALID STATE TRANSITIONS (Reference Table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS valid_state_transitions (
  id SERIAL PRIMARY KEY,
  from_status VARCHAR(50), -- NULL allowed for initial state
  to_status VARCHAR(50) NOT NULL,
  allowed_actors VARCHAR(20)[] NOT NULL, -- Array of actor types
  requires_lock BOOLEAN DEFAULT false,
  description TEXT,
  
  UNIQUE(from_status, to_status)
);

-- Insert valid transitions
INSERT INTO valid_state_transitions (from_status, to_status, allowed_actors, requires_lock, description) VALUES
-- Initial submission
(NULL, 'CART_DRAFT', ARRAY['customer', 'system'], false, 'New cart created'),
('CART_DRAFT', 'ORDER_SUBMITTED', ARRAY['customer', 'system'], false, 'Customer clicked call button'),

-- Manager confirmation
('ORDER_SUBMITTED', 'CONFIRMED_BY_MANAGER', ARRAY['admin'], true, 'Manager confirmed inventory'),
('ORDER_SUBMITTED', 'CANCELLED', ARRAY['admin', 'customer'], false, 'Order cancelled'),

-- Rider assignment
('CONFIRMED_BY_MANAGER', 'DELIVERY_REQUEST_STARTED', ARRAY['admin'], true, 'Admin assigned rider'),
('CONFIRMED_BY_MANAGER', 'CANCELLED', ARRAY['admin', 'customer'], false, 'Order cancelled'),

-- Rider confirmation (hybrid paths)
('DELIVERY_REQUEST_STARTED', 'RIDER_CONFIRMED_DIGITAL', ARRAY['rider', 'webhook'], true, 'Rider confirmed via WhatsApp'),
('DELIVERY_REQUEST_STARTED', 'RIDER_CONFIRMED_MANUAL', ARRAY['admin'], true, 'Admin marked rider confirmed after phone call'),
('DELIVERY_REQUEST_STARTED', 'CANCELLED', ARRAY['admin', 'customer'], false, 'Order cancelled'),

-- Out for delivery
('RIDER_CONFIRMED_DIGITAL', 'OUT_FOR_DELIVERY', ARRAY['rider', 'webhook', 'admin'], true, 'Rider started delivery'),
('RIDER_CONFIRMED_MANUAL', 'OUT_FOR_DELIVERY', ARRAY['admin'], true, 'Rider started delivery (manual)'),
('RIDER_CONFIRMED_DIGITAL', 'CANCELLED', ARRAY['admin'], false, 'Order cancelled'),
('RIDER_CONFIRMED_MANUAL', 'CANCELLED', ARRAY['admin'], false, 'Order cancelled'),

-- Delivery complete
('OUT_FOR_DELIVERY', 'DELIVERED', ARRAY['rider', 'webhook', 'admin'], false, 'Order delivered'),
('OUT_FOR_DELIVERY', 'CANCELLED', ARRAY['admin'], false, 'Order cancelled'),

-- Terminal states
('DELIVERED', 'CANCELLED', ARRAY['admin'], false, 'Administrative cancellation');

-- =============================================================================
-- PART 8: FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to validate state transitions
CREATE OR REPLACE FUNCTION validate_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_actor BOOLEAN;
  transition_record RECORD;
BEGIN
  -- Skip validation if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Check if transition is valid
  SELECT * INTO transition_record
  FROM valid_state_transitions
  WHERE from_status = OLD.status 
    AND to_status = NEW.status;
  
  IF transition_record IS NULL THEN
    RAISE EXCEPTION 'Invalid state transition: % -> %', OLD.status, NEW.status;
  END IF;
  
  -- Update version and timestamps
  NEW.state_version = COALESCE(OLD.state_version, 0) + 1;
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to orders table
DROP TRIGGER IF EXISTS validate_order_state_transition ON orders;
CREATE TRIGGER validate_order_state_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_state_transition();

-- Function to log state transitions automatically
CREATE OR REPLACE FUNCTION log_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_state_transitions (
      order_id,
      previous_status,
      new_status,
      actor_type,
      actor_id,
      action,
      action_metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.last_actor_type, 'system'),
      NEW.last_actor_id,
      'STATUS_CHANGE',
      jsonb_build_object(
        'version', NEW.state_version,
        'confirmation_method', NEW.confirmation_method
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply logging trigger
DROP TRIGGER IF EXISTS log_order_state_transition ON orders;
CREATE TRIGGER log_order_state_transition
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_state_transition();

-- Function to acquire order lock
CREATE OR REPLACE FUNCTION acquire_order_lock(
  p_order_id UUID,
  p_admin_id UUID,
  p_session_id VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  lock_exists BOOLEAN;
BEGIN
  -- Clean expired locks first
  PERFORM clean_expired_order_locks();
  
  -- Check if lock exists and is held by someone else
  SELECT EXISTS(
    SELECT 1 FROM order_locks 
    WHERE order_id = p_order_id 
    AND locked_by != p_admin_id
    AND expires_at > NOW()
  ) INTO lock_exists;
  
  IF lock_exists THEN
    RETURN false;
  END IF;
  
  -- Acquire or refresh lock
  INSERT INTO order_locks (order_id, locked_by, session_id, expires_at)
  VALUES (p_order_id, p_admin_id, p_session_id, NOW() + INTERVAL '5 minutes')
  ON CONFLICT (order_id) 
  DO UPDATE SET 
    locked_by = p_admin_id,
    locked_at = NOW(),
    expires_at = NOW() + INTERVAL '5 minutes',
    session_id = p_session_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to release order lock
CREATE OR REPLACE FUNCTION release_order_lock(
  p_order_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM order_locks 
  WHERE order_locks.order_id = p_order_id 
  AND locked_by = p_admin_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to assign rider with availability check
CREATE OR REPLACE FUNCTION assign_rider_to_order(
  p_order_id UUID,
  p_rider_id UUID,
  p_admin_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_rider_status VARCHAR;
  v_current_order UUID;
BEGIN
  -- Check rider availability with lock
  SELECT status, current_order_id 
  INTO v_rider_status, v_current_order
  FROM rider_availability
  WHERE rider_id = p_rider_id
  FOR UPDATE;
  
  IF v_rider_status IS NULL THEN
    -- Create availability record if not exists
    INSERT INTO rider_availability (rider_id, status)
    VALUES (p_rider_id, 'AVAILABLE');
    v_rider_status := 'AVAILABLE';
  END IF;
  
  IF v_rider_status != 'AVAILABLE' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Rider not available',
      'current_status', v_rider_status,
      'current_order', v_current_order
    );
  END IF;
  
  -- Update order
  UPDATE orders 
  SET rider_id = p_rider_id, 
      status = 'DELIVERY_REQUEST_STARTED',
      last_actor_type = 'admin',
      last_actor_id = p_admin_id,
      updated_at = NOW()
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Mark rider as assigned
  UPDATE rider_availability 
  SET status = 'ON_DELIVERY', 
      current_order_id = p_order_id,
      last_updated = NOW()
  WHERE rider_id = p_rider_id;
  
  -- Log the assignment
  INSERT INTO order_state_transitions (
    order_id, previous_status, new_status, 
    actor_type, actor_id, action, action_metadata
  )
  SELECT 
    p_order_id, status, 'DELIVERY_REQUEST_STARTED',
    'admin', p_admin_id, 'RIDER_ASSIGNED',
    jsonb_build_object('rider_id', p_rider_id)
  FROM orders WHERE id = p_order_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 9: ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE order_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_state_transitions
CREATE POLICY "Admins can view all transitions" 
ON order_state_transitions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Riders can view their own order transitions" 
ON order_state_transitions FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_state_transitions.order_id 
  AND orders.rider_id = auth.uid()
));

-- RLS Policies for rider_availability
CREATE POLICY "Admins can view all rider availability" 
ON rider_availability FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Riders can view own availability" 
ON rider_availability FOR SELECT 
USING (rider_id = auth.uid());

CREATE POLICY "Admins can update rider availability" 
ON rider_availability FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
));

-- RLS Policies for webhook_events (admin only)
CREATE POLICY "Admins can view webhook events" 
ON webhook_events FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
));

-- =============================================================================
-- PART 10: INDEXES FOR PERFORMANCE
-- =============================================================================

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON orders(rider_id) WHERE rider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_state_version ON orders(id, state_version);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================