// =============================================================================
// Order Service
// Core business logic for order management
// =============================================================================

import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { stateMachine } from './stateMachine';
import { v4 as uuidv4 } from 'uuid';
import {
  Order,
  OrderStatus,
  ActorType,
  ConfirmationMethod,
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  AssignRiderRequest,
  ConfirmDeliveryRequest,
  UpdateOrderDetailsRequest,
  DeleteOrderRequest,
  RestoreOrderRequest,
  StateTransition,
  ValidStateTransition,
  StateTransitionError,
  RaceConditionError,
  RiderUnavailableError,
  RiderStatus,
} from '../types/order';

// Default fallback values - must be configured in settings (no hardcoded prices)
const DEFAULT_VAT_RATE = 0;
const DEFAULT_BASE_FEE = 0;
const DEFAULT_FREE_THRESHOLD = 0;

// Cache for pricing config
let pricingConfig: {
  vatRate: number;
  baseDeliveryFee: number;
  freeDeliveryThreshold: number;
} | null = null;

/**
 * Fetch pricing settings from database
 */
async function getPricingConfig(): Promise<typeof pricingConfig> {
  if (pricingConfig) return pricingConfig;
  
  try {
    const { data, error } = await supabase
      .from('pricing_settings')
      .select('key, value')
      .in('key', ['vat_rate', 'base_delivery_fee', 'free_delivery_threshold']);
    
    if (error) throw error;
    
    const settings: Record<string, { rate?: number; amount?: number }> = {};
    for (const item of data || []) {
      const value = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
      settings[item.key] = value;
    }
    
    pricingConfig = {
      vatRate: settings.vat_rate?.rate ?? DEFAULT_VAT_RATE,
      baseDeliveryFee: settings.base_delivery_fee?.amount ?? DEFAULT_BASE_FEE,
      freeDeliveryThreshold: settings.free_delivery_threshold?.amount ?? DEFAULT_FREE_THRESHOLD,
    };
    
    logger.info('Pricing config loaded', pricingConfig);
    return pricingConfig;
  } catch (error) {
    logger.error('Failed to load pricing config, using defaults', { error });
    return {
      vatRate: DEFAULT_VAT_RATE,
      baseDeliveryFee: DEFAULT_BASE_FEE,
      freeDeliveryThreshold: DEFAULT_FREE_THRESHOLD,
    };
  }
}

// =============================================================================
// Order Service Class
// =============================================================================

export class OrderService {
  /**
   * Create a new order (triggered by call button)
   */
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const idempotencyKey = request.idempotency_key || this.generateIdempotencyKey(request);
    
    // Check for duplicate
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();
    
    if (existingOrder) {
      logger.info('Duplicate order creation prevented', { idempotencyKey, orderId: existingOrder.id });
      return existingOrder as Order;
    }

    // Calculate total
    const totalAmount = request.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    // Fetch dynamic VAT rate from pricing settings
    const pricing = await getPricingConfig();
    const vatRate = pricing?.vatRate ?? DEFAULT_VAT_RATE;
    const vatAmount = request.vat_amount ?? Math.round(totalAmount * vatRate);

    // Delivery fee (passed from frontend or calculated)
    const deliveryFee = request.delivery_fee ?? 0;

    // Total with delivery and tax
    const grandTotal = totalAmount + vatAmount + deliveryFee;

    // Create order
    const orderData = {
      status: OrderStatus.ORDER_SUBMITTED,
      customer_phone: request.customer_phone,
      customer_name: request.customer_name || null,
      delivery_address: request.delivery_address,
      delivery_notes: request.delivery_notes || null,
      branch_id: request.branch_id,
      total_amount: grandTotal,
      delivery_fee: deliveryFee,
      vat_amount: vatAmount,
      delivery_zone_id: request.delivery_zone_id || null,
      distance_km: request.distance_km || null,
      idempotency_key: idempotencyKey,
      last_actor_type: ActorType.CUSTOMER,
      metadata: {
        trigger_source: request.trigger_source,
        item_count: request.items.length,
        subtotal: totalAmount,
      },
    };

    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create order', { error, request });
      throw new Error(`Failed to create order: ${error.message}`);
    }

    // Create order items
    const orderItems = request.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      variant: item.variant || null,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      logger.error('Failed to create order items', { error: itemsError, orderId: order.id });
      // Don't throw - order exists, items can be retrieved separately
    }

    logger.info('Order created successfully', { 
      orderId: order.id, 
      customerPhone: request.customer_phone,
      subtotal: totalAmount,
      vatAmount,
      deliveryFee,
      grandTotal,
    });

    return order as Order;
  }

  /**
   * Get order by ID
   * @param includeDeleted If true, includes soft-deleted orders
   */
  async getOrder(orderId: string, includeDeleted = false): Promise<Order | null> {
    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', orderId);

    // Filter out deleted orders by default
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Failed to get order', { error, orderId });
      throw error;
    }

    return data as Order;
  }

  /**
   * Update order status with state machine validation
   */
  async updateOrderStatus(
    orderId: string,
    request: UpdateOrderStatusRequest
  ): Promise<Order> {
    // Get current order
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    logger.info('Updating order status', { 
      orderId, 
      currentStatus: order.status, 
      newStatus: request.status,
      actorType: request.actor_type 
    });

    // Validate state transition
    stateMachine.assertValidTransition(
      order.status,
      request.status,
      request.actor_type
    );

    // Ensure DB transition table has the required transition (prevents trigger failures)
    const transitionCheck = stateMachine.validateTransition(
      order.status,
      request.status,
      request.actor_type
    );
    if (transitionCheck.valid && transitionCheck.transition) {
      await this.ensureValidTransitionRecord(transitionCheck.transition);
    }

    // Check for race conditions (optimistic locking)
    if (request.expected_version !== undefined) {
      if (order.state_version !== request.expected_version) {
        throw new RaceConditionError(
          'Order was modified by another process',
          request.expected_version,
          order.state_version
        );
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: request.status,
      last_actor_type: request.actor_type,
      last_actor_id: request.actor_id,
      state_version: (order.state_version || 0) + 1,
    };

    // Add confirmation metadata if applicable
    if (request.confirmation_method) {
      updateData.confirmation_method = request.confirmation_method;
      updateData.confirmation_by = request.actor_id;
      updateData.confirmation_at = new Date().toISOString();
    }

    // Merge metadata
    if (request.metadata) {
      updateData.metadata = {
        ...order.metadata,
        ...request.metadata,
      };
    }

    // Execute update
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update order status', { error, orderId, request });
      throw error;
    }

    logger.info('Order status updated', {
      orderId,
      fromStatus: order.status,
      toStatus: request.status,
      actorType: request.actor_type,
      actorId: request.actor_id,
    });

    return updatedOrder as Order;
  }

  private async ensureValidTransitionRecord(transition: ValidStateTransition): Promise<void> {
    const { data, error } = await supabase
      .from('valid_state_transitions')
      .select('id')
      .eq('from_status', transition.from_status)
      .eq('to_status', transition.to_status)
      .maybeSingle();

    if (error) {
      logger.warn('Failed to check valid_state_transitions', { error, transition });
      return;
    }

    if (!data) {
      const { error: insertError } = await supabase
        .from('valid_state_transitions')
        .insert({
          from_status: transition.from_status,
          to_status: transition.to_status,
          allowed_actors: transition.allowed_actors,
          requires_lock: transition.requires_lock,
          description: transition.description,
        });

      if (insertError) {
        logger.warn('Failed to insert valid_state_transition', { insertError, transition });
      }
    }
  }

  /**
   * Assign rider to order
   */
  async assignRider(orderId: string, request: AssignRiderRequest): Promise<Order> {
    // Get current order first for logging
    const currentOrder = await this.getOrder(orderId);
    logger.info('assignRider: Starting', { 
      orderId, 
      riderId: request.rider_id,
      adminId: request.admin_id,
      currentStatus: currentOrder?.status,
    });
    
    // Call the database function for atomic rider assignment
    const { data, error } = await supabase.rpc('assign_rider_to_order', {
      p_order_id: orderId,
      p_rider_id: request.rider_id,
      p_admin_id: request.admin_id,
    });

    logger.info('assign_rider_to_order RPC result', { 
      orderId, 
      data, 
      error,
      rawError: error ? JSON.stringify(error) : null,
    });

    if (error) {
      logger.error('Failed to assign rider - RPC error', { error, orderId, request });
      // Return a more descriptive error
      throw new Error(error.message || 'Database error assigning rider');
    }

    const result = data as { success: boolean; error?: string; current_status?: string; current_order?: string };
    
    logger.info('assign_rider_to_order result parsing', { 
      orderId, 
      result,
      resultString: JSON.stringify(result),
    });
    
    if (!result.success) {
      logger.warn('assign_rider_to_order returned failure', { orderId, result });
      if (result.error === 'Rider not available') {
        throw new RiderUnavailableError(
          `Rider ${request.rider_id} is not available`,
          request.rider_id,
          result.current_status as RiderStatus
        );
      }
      throw new Error(result.error || 'Failed to assign rider');
    }

    // Return updated order
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order not found after assignment: ${orderId}`);
    }

    logger.info('Rider assigned to order', {
      orderId,
      riderId: request.rider_id,
      adminId: request.admin_id,
    });

    return order;
  }

  /**
   * Confirm rider (hybrid digital/manual)
   */
  async confirmRider(
    orderId: string,
    request: ConfirmDeliveryRequest
  ): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Check if already confirmed
    if (order.status === OrderStatus.RIDER_CONFIRMED_DIGITAL || 
        order.status === OrderStatus.RIDER_CONFIRMED_MANUAL) {
      
      const currentMethod = order.status === OrderStatus.RIDER_CONFIRMED_DIGITAL 
        ? ConfirmationMethod.DIGITAL 
        : ConfirmationMethod.MANUAL;

      // If same method, this is a duplicate
      if (currentMethod === request.confirmation_method) {
        logger.info('Duplicate confirmation prevented', { orderId, method: request.confirmation_method });
        return order;
      }

      // If different method, log the redundancy but don't change state
      logger.info('Redundant confirmation (different method)', {
        orderId,
        existingMethod: currentMethod,
        newMethod: request.confirmation_method,
      });
      
      return order;
    }

    // Validate we're in the right state
    if (order.status !== OrderStatus.DELIVERY_REQUEST_STARTED) {
      throw new StateTransitionError(
        `Cannot confirm rider from status ${order.status}`,
        order.status,
        request.confirmation_method === ConfirmationMethod.DIGITAL 
          ? OrderStatus.RIDER_CONFIRMED_DIGITAL 
          : OrderStatus.RIDER_CONFIRMED_MANUAL
      );
    }

    // Determine target status
    const targetStatus = request.confirmation_method === ConfirmationMethod.DIGITAL
      ? OrderStatus.RIDER_CONFIRMED_DIGITAL
      : OrderStatus.RIDER_CONFIRMED_MANUAL;

    // Update status
    return this.updateOrderStatus(orderId, {
      status: targetStatus,
      actor_type: request.actor_type,
      actor_id: request.actor_id,
      confirmation_method: request.confirmation_method,
      metadata: {
        confirmation_notes: request.notes,
      },
    });
  }

  /**
   * Mark order as out for delivery
   */
  async startDelivery(
    orderId: string,
    actorType: ActorType,
    actorId: string
  ): Promise<Order> {
    return this.updateOrderStatus(orderId, {
      status: OrderStatus.OUT_FOR_DELIVERY,
      actor_type: actorType,
      actor_id: actorId,
    });
  }

  /**
   * Mark order as delivered
   */
  async completeDelivery(
    orderId: string,
    actorType: ActorType,
    actorId: string
  ): Promise<Order> {
    const order = await this.updateOrderStatus(orderId, {
      status: OrderStatus.DELIVERED,
      actor_type: actorType,
      actor_id: actorId,
    });

    // Update rider availability
    if (order.rider_id) {
      await supabase
        .from('rider_availability')
        .update({
          status: RiderStatus.AVAILABLE,
          current_order_id: null,
          total_deliveries: supabase.rpc('increment', { row_id: order.rider_id }),
          last_updated: new Date().toISOString(),
        })
        .eq('rider_id', order.rider_id);
    }

    return order;
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    actorType: ActorType,
    actorId: string,
    reason?: string
  ): Promise<Order> {
    // Release rider if assigned
    const order = await this.getOrder(orderId);
    if (order?.rider_id) {
      await supabase
        .from('rider_availability')
        .update({
          status: RiderStatus.AVAILABLE,
          current_order_id: null,
          last_updated: new Date().toISOString(),
        })
        .eq('rider_id', order.rider_id);
    }

    return this.updateOrderStatus(orderId, {
      status: OrderStatus.CANCELLED,
      actor_type: actorType,
      actor_id: actorId,
      metadata: {
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Update order details (customer name, address, notes)
   * Returns null if order not found
   */
  async updateOrderDetails(
    orderId: string,
    request: UpdateOrderDetailsRequest
  ): Promise<Order | null> {
    const order = await this.getOrder(orderId);
    
    if (!order) {
      return null; // Order not found
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_actor_type: request.actor_type,
      last_actor_id: request.actor_id,
    };

    if (request.customer_name !== undefined) {
      updateData.customer_name = request.customer_name || null;
    }

    if (request.delivery_address !== undefined) {
      updateData.delivery_address = request.delivery_address;
    }

    if (request.delivery_notes !== undefined) {
      updateData.delivery_notes = request.delivery_notes || null;
    }

    if (request.customer_phone !== undefined) {
      updateData.customer_phone = request.customer_phone || null;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update order details', { error, orderId, request });
      throw new Error(`Failed to update order: ${error.message}`);
    }

    return data as Order;
  }

  /**
   * Get orders by status
   * @param includeDeleted If true, includes soft-deleted orders
   */
  async getOrdersByStatus(status: OrderStatus, branchId?: string, includeDeleted = false): Promise<Order[]> {
    let query = supabase
      .from('orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    // Filter out deleted orders by default
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get orders by status', { error, status, branchId });
      throw new Error(`Failed to get orders: ${error.message} (${error.code})`);
    }

    return data as Order[];
  }

  /**
   * Get order audit trail
   */
  async getOrderHistory(orderId: string): Promise<StateTransition[]> {
    const { data, error } = await supabase
      .from('order_state_transitions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to get order history', { error, orderId });
      throw error;
    }

    return data as StateTransition[];
  }

  /**
   * Acquire lock on order
   */
  async acquireLock(orderId: string, adminId: string, sessionId?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('acquire_order_lock', {
      p_order_id: orderId,
      p_admin_id: adminId,
      p_session_id: sessionId,
    });

    if (error) {
      logger.error('Failed to acquire lock', { error, orderId, adminId });
      return false;
    }

    return data as boolean;
  }

  /**
   * Release lock on order
   */
  async releaseLock(orderId: string, adminId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('release_order_lock', {
      p_order_id: orderId,
      p_admin_id: adminId,
    });

    if (error) {
      logger.error('Failed to release lock', { error, orderId, adminId });
      return false;
    }

    return data as boolean;
  }

  // =============================================================================
  // Soft Delete Methods
  // =============================================================================

  /**
   * Soft delete an order
   * Sets deleted_at timestamp and records who deleted it
   */
  async deleteOrder(orderId: string, request: DeleteOrderRequest): Promise<Order> {
    // Check if order exists
    const order = await this.getOrder(orderId, true);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Check if already deleted
    if (order.deleted_at) {
      throw new Error('Order is already deleted');
    }

    // Validate confirmation
    if (!request.confirm) {
      throw new Error('Deletion confirmation required. Set confirm: true to delete.');
    }

    const updateData = {
      deleted_at: new Date().toISOString(),
      deleted_by: request.actor_id,
      metadata: {
        ...order.metadata,
        deletion_reason: request.reason,
        deleted_by_actor_type: request.actor_type,
      },
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to soft delete order', { error, orderId, request });
      throw new Error(`Failed to delete order: ${error.message}`);
    }

    logger.info('Order soft deleted', {
      orderId,
      actorType: request.actor_type,
      actorId: request.actor_id,
      reason: request.reason,
    });

    return data as Order;
  }

  /**
   * Restore a soft-deleted order
   */
  async restoreOrder(orderId: string, request: RestoreOrderRequest): Promise<Order> {
    // Check if order exists (including deleted)
    const order = await this.getOrder(orderId, true);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Check if not deleted
    if (!order.deleted_at) {
      throw new Error('Order is not deleted');
    }

    const updateData = {
      deleted_at: null,
      deleted_by: null,
      metadata: {
        ...order.metadata,
        restored_by_actor_type: request.actor_type,
        restored_at: new Date().toISOString(),
      },
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to restore order', { error, orderId, request });
      throw new Error(`Failed to restore order: ${error.message}`);
    }

    logger.info('Order restored', {
      orderId,
      actorType: request.actor_type,
      actorId: request.actor_id,
    });

    return data as Order;
  }

  /**
   * Get all soft-deleted orders
   */
  async getDeletedOrders(branchId?: string): Promise<Order[]> {
    let query = supabase
      .from('orders')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get deleted orders', { error, branchId });
      throw new Error(`Failed to get deleted orders: ${error.message}`);
    }

    return data as Order[];
  }

  /**
   * Permanently delete an order and all its related data
   * WARNING: This is irreversible!
   */
  async permanentlyDeleteOrder(orderId: string, actorType: ActorType, actorId: string): Promise<void> {
    // Check if order exists (including deleted)
    const order = await this.getOrder(orderId, true);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Delete order items first (due to foreign key)
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsError) {
      logger.error('Failed to delete order items', { error: itemsError, orderId });
      throw new Error(`Failed to delete order items: ${itemsError.message}`);
    }

    // Delete state transitions
    const { error: transitionsError } = await supabase
      .from('order_state_transitions')
      .delete()
      .eq('order_id', orderId);

    if (transitionsError) {
      logger.warn('Failed to delete order transitions', { error: transitionsError, orderId });
    }

    // Delete the order itself
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderError) {
      logger.error('Failed to permanently delete order', { error: orderError, orderId });
      throw new Error(`Failed to permanently delete order: ${orderError.message}`);
    }

    logger.info('Order permanently deleted', {
      orderId,
      actorType,
      actorId,
      orderReference: order.order_reference,
    });
  }

  /**
   * Generate idempotency key from request
   */
  private generateIdempotencyKey(request: CreateOrderRequest): string {
    const data = `${request.customer_phone}:${request.branch_id}:${request.items.length}:${Date.now()}`;
    return Buffer.from(data).toString('base64').substring(0, 64);
  }
}

// Singleton instance
export const orderService = new OrderService();
