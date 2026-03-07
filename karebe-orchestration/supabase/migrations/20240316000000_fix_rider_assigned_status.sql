-- =============================================================================
-- Fix RIDER_ASSIGNED to RIDER_CONFIRMED_DIGITAL
-- The assign_rider_to_order RPC was using non-existent status 'RIDER_ASSIGNED'
-- Should use RIDER_CONFIRMED_DIGITAL to match the state machine
-- =============================================================================

-- Drop and recreate the function with the correct status
CREATE OR REPLACE FUNCTION assign_rider_to_order(
  p_order_id UUID,
  p_rider_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status VARCHAR(100);
  v_order_exists BOOLEAN;
BEGIN
  -- Check if order exists
  SELECT EXISTS(SELECT 1 FROM orders WHERE id = p_order_id) INTO v_order_exists;
  IF NOT v_order_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Get current order status
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;

  -- Validate current status allows rider assignment
  IF v_current_status != 'DELIVERY_REQUEST_STARTED' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Order must be in DELIVERY_REQUEST_STARTED status to assign rider',
      'current_status', v_current_status
    );
  END IF;

  -- Update the order with rider
  UPDATE orders 
  SET 
    rider_id = p_rider_id,
    last_actor_type = 'admin',
    last_actor_id = p_admin_id,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Update rider availability
  UPDATE rider_availability 
  SET status = 'ON_DELIVERY', 
      current_order_id = p_order_id,
      last_updated = NOW()
  WHERE rider_id = p_rider_id;
  
  -- Log the assignment - FIX: use RIDER_CONFIRMED_DIGITAL instead of RIDER_ASSIGNED
  INSERT INTO order_state_transitions (
    order_id, previous_status, new_status, 
    actor_type, actor_id, action, action_metadata
  )
  SELECT 
    p_order_id, status, 'RIDER_CONFIRMED_DIGITAL',
    'admin', p_admin_id, 'RIDER_CONFIRMED_DIGITAL',
    jsonb_build_object('rider_id', p_rider_id)
  FROM orders WHERE id = p_order_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;
