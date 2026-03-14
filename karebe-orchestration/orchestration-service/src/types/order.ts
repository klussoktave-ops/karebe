// =============================================================================
// Order State Machine Types
// =============================================================================

/**
 * Legacy statuses (for backward compatibility)
 * New code should use WorkflowStatus instead
 */
export const OrderStatus = {
  CART_DRAFT: 'CART_DRAFT',
  ORDER_SUBMITTED: 'ORDER_SUBMITTED',
  CONFIRMED_BY_MANAGER: 'CONFIRMED_BY_MANAGER',
  DELIVERY_REQUEST_STARTED: 'DELIVERY_REQUEST_STARTED',
  RIDER_CONFIRMED_DIGITAL: 'RIDER_CONFIRMED_DIGITAL',
  RIDER_CONFIRMED_MANUAL: 'RIDER_CONFIRMED_MANUAL',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

/**
 * New workflow-based statuses
 * These map to clearer shop-owner language
 */
export const WorkflowStatus = {
  // Primary workflow
  NEW: 'NEW',                          // Just received, needs review
  CONFIRMING: 'CONFIRMING',           // Calling customer to confirm
  PREPARING: 'PREPARING',             // Order being prepared
  READY: 'READY',                     // Ready for pickup/delivery
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY', // With rider
  COMPLETED: 'COMPLETED',             // Delivered successfully
  
  // Terminal states
  CANCELLED: 'CANCELLED',
  
  // Exception states
  UNREACHABLE: 'UNREACHABLE',         // Customer not answering
  DELAYED: 'DELAYED',                 // Order delayed
  
  // Legacy mappings (for backward compatibility)
  CART_DRAFT: 'CART_DRAFT',
  ORDER_SUBMITTED: 'ORDER_SUBMITTED',
  CONFIRMED_BY_MANAGER: 'CONFIRMED_BY_MANAGER',
  DELIVERY_REQUEST_STARTED: 'DELIVERY_REQUEST_STARTED',
  RIDER_CONFIRMED_DIGITAL: 'RIDER_CONFIRMED_DIGITAL',
  RIDER_CONFIRMED_MANUAL: 'RIDER_CONFIRMED_MANUAL',
  DELIVERED: 'DELIVERED',
} as const;

export type WorkflowStatus = typeof WorkflowStatus[keyof typeof WorkflowStatus];

/**
 * Status mapping for backward compatibility
 * Maps legacy statuses to new workflow statuses
 */
export const LEGACY_TO_WORKFLOW_MAP: Record<OrderStatus, WorkflowStatus> = {
  CART_DRAFT: 'CART_DRAFT',
  ORDER_SUBMITTED: 'NEW',
  CONFIRMED_BY_MANAGER: 'PREPARING',
  DELIVERY_REQUEST_STARTED: 'READY',
  RIDER_CONFIRMED_DIGITAL: 'OUT_FOR_DELIVERY',
  RIDER_CONFIRMED_MANUAL: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

/**
 * Reverse mapping: workflow to legacy
 */
export const WORKFLOW_TO_LEGACY_MAP: Record<WorkflowStatus, OrderStatus> = {
  NEW: OrderStatus.ORDER_SUBMITTED,
  CONFIRMING: OrderStatus.CONFIRMED_BY_MANAGER,
  PREPARING: OrderStatus.CONFIRMED_BY_MANAGER,
  READY: OrderStatus.DELIVERY_REQUEST_STARTED,
  OUT_FOR_DELIVERY: OrderStatus.OUT_FOR_DELIVERY,
  COMPLETED: OrderStatus.DELIVERED,
  CANCELLED: OrderStatus.CANCELLED,
  UNREACHABLE: OrderStatus.CANCELLED,
  DELAYED: OrderStatus.DELIVERY_REQUEST_STARTED,
  CART_DRAFT: OrderStatus.CART_DRAFT,
  ORDER_SUBMITTED: OrderStatus.ORDER_SUBMITTED,
  CONFIRMED_BY_MANAGER: OrderStatus.CONFIRMED_BY_MANAGER,
  DELIVERY_REQUEST_STARTED: OrderStatus.DELIVERY_REQUEST_STARTED,
  RIDER_CONFIRMED_DIGITAL: OrderStatus.RIDER_CONFIRMED_DIGITAL,
  RIDER_CONFIRMED_MANUAL: OrderStatus.RIDER_CONFIRMED_MANUAL,
  DELIVERED: OrderStatus.DELIVERED,
};

export const ActorType = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  RIDER: 'rider',
  SYSTEM: 'system',
  WEBHOOK: 'webhook',
} as const;

export type ActorType = typeof ActorType[keyof typeof ActorType];

export const ConfirmationMethod = {
  DIGITAL: 'DIGITAL',
  MANUAL: 'MANUAL',
} as const;

export type ConfirmationMethod = typeof ConfirmationMethod[keyof typeof ConfirmationMethod];

export const RiderStatus = {
  AVAILABLE: 'AVAILABLE',
  ON_DELIVERY: 'ON_DELIVERY',
  OFF_DUTY: 'OFF_DUTY',
  BREAK: 'BREAK',
} as const;

export type RiderStatus = typeof RiderStatus[keyof typeof RiderStatus];

// =============================================================================
// Order Domain Model
// =============================================================================

export interface Order {
  id: string;
  order_reference?: string;  // New human-friendly reference (e.g., KRB-042)
  status: OrderStatus;
  workflow_status?: WorkflowStatus;  // New workflow status
  customer_phone: string;
  customer_name?: string;
  customer_email?: string;
  delivery_address: string;
  delivery_notes?: string;
  delivery_method?: 'delivery' | 'pickup';  // New field
  branch_id: string;
  rider_id?: string;
  total_amount: number;
  delivery_fee: number;
  vat_amount: number;
  delivery_zone_id?: string;
  distance_km?: number;
  confirmation_method?: ConfirmationMethod;
  confirmation_by?: string;
  confirmation_at?: string;
  last_actor_type?: ActorType;
  last_actor_id?: string;
  state_version: number;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Soft delete fields
  deleted_at?: string;
  deleted_by?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant?: string;
}

// =============================================================================
// State Transition Types
// =============================================================================

export interface StateTransition {
  id: string;
  order_id: string;
  previous_status?: OrderStatus;
  new_status: OrderStatus;
  actor_type: ActorType;
  actor_id?: string;
  actor_name?: string;
  action: string;
  action_metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  created_at: string;
}

export interface ValidStateTransition {
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  allowed_actors: ActorType[];
  requires_lock: boolean;
  description: string;
}

// =============================================================================
// Workflow Action Types
// =============================================================================

/**
 * Available workflow actions for shop owners
 * These are user-friendly actions that map to state transitions
 */
export type WorkflowAction = 
  | 'confirm_order'
  | 'call_customer'
  | 'start_preparing'
  | 'mark_ready'
  | 'send_out_delivery'
  | 'customer_picking_up'
  | 'confirm_delivered'
  | 'mark_unreachable'
  | 'report_delay'
  | 'cancel_order';

/**
 * Action metadata for workflow actions
 */
export interface WorkflowActionPayload {
  action: WorkflowAction;
  actor_type: ActorType;
  actor_id: string;
  notes?: string;
  confirmation_method?: ConfirmationMethod;
  expected_version?: number;
}

/**
 * Get available actions for a given workflow status
 */
export function getAvailableActions(status: WorkflowStatus): WorkflowAction[] {
  switch (status) {
    case 'NEW':
      return ['confirm_order', 'call_customer', 'cancel_order'];
    case 'CONFIRMING':
      return ['start_preparing', 'mark_unreachable', 'cancel_order'];
    case 'PREPARING':
      return ['mark_ready', 'report_delay'];
    case 'READY':
      return ['send_out_delivery', 'customer_picking_up', 'cancel_order'];
    case 'OUT_FOR_DELIVERY':
      return ['confirm_delivered'];
    case 'COMPLETED':
    case 'CANCELLED':
    case 'UNREACHABLE':
    case 'DELAYED':
      return []; // Terminal states, no actions
    default:
      return [];
  }
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateOrderRequest {
  customer_phone: string;
  customer_name?: string;
  delivery_address: string;
  delivery_notes?: string;
  delivery_method?: 'delivery' | 'pickup';
  branch_id: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    variant?: string;
  }>;
  trigger_source: 'call_button' | 'cart_checkout' | 'whatsapp';
  idempotency_key?: string;
  delivery_fee?: number;
  vat_amount?: number;
  delivery_zone_id?: string;
  distance_km?: number;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  actor_type: ActorType;
  actor_id: string;
  confirmation_method?: ConfirmationMethod;
  metadata?: Record<string, unknown>;
  expected_version?: number;
}

export interface WorkflowUpdateRequest {
  action: WorkflowAction;
  actor_type: ActorType;
  actor_id: string;
  notes?: string;
  confirmation_method?: ConfirmationMethod;
  expected_version?: number;
}

export interface AssignRiderRequest {
  rider_id: string;
  admin_id: string;
  notes?: string;
}

export interface ConfirmDeliveryRequest {
  confirmation_method: ConfirmationMethod;
  actor_type: ActorType;
  actor_id: string;
  notes?: string;
}

export interface UpdateOrderDetailsRequest {
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  delivery_notes?: string;
  delivery_method?: 'delivery' | 'pickup';
  actor_type: ActorType;
  actor_id: string;
}

// =============================================================================
// Soft Delete Types
// =============================================================================

export interface DeleteOrderRequest {
  actor_type: ActorType;
  actor_id: string;
  reason?: string;
  confirm: true;  // Required confirmation
}

export interface RestoreOrderRequest {
  actor_type: ActorType;
  actor_id: string;
}

export interface PermanentDeleteRequest {
  actor_type: ActorType;
  actor_id: string;
  confirm: true;  // Required confirmation for irreversible action
}

// =============================================================================
// Rider Types
// =============================================================================

export interface Rider {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  whatsapp_number?: string;
  branch_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface RiderAvailability {
  rider_id: string;
  status: RiderStatus;
  current_order_id?: string;
  phone_number?: string;
  whatsapp_number?: string;
  total_deliveries: number;
  rating: number;
  last_updated: string;
  created_at: string;
}

// =============================================================================
// Webhook Types
// =============================================================================

export interface WebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  source: 'mautrix' | 'manual' | 'system';
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'ignored';
  processed_at?: string;
  error_message?: string;
  retry_count: number;
  resulting_order_id?: string;
  resulting_action?: string;
  created_at: string;
  updated_at: string;
}

export interface MautrixWebhookPayload {
  event_id: string;
  room_id: string;
  sender: string;
  content: {
    body: string;
    msgtype: string;
  };
  timestamp: number;
}

// =============================================================================
// Lock Types
// =============================================================================

export interface OrderLock {
  order_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
  lock_reason?: string;
  session_id?: string;
}

// =============================================================================
// Error Types
// =============================================================================

export class StateTransitionError extends Error {
  constructor(
    message: string,
    public fromStatus: OrderStatus,
    public toStatus: OrderStatus,
    public code: string = 'INVALID_TRANSITION'
  ) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

export class RaceConditionError extends Error {
  constructor(
    message: string,
    public expectedVersion: number,
    public actualVersion: number,
    public code: string = 'RACE_CONDITION'
  ) {
    super(message);
    this.name = 'RaceConditionError';
  }
}

export class RiderUnavailableError extends Error {
  constructor(
    message: string,
    public riderId: string,
    public currentStatus: RiderStatus,
    public code: string = 'RIDER_UNAVAILABLE'
  ) {
    super(message);
    this.name = 'RiderUnavailableError';
  }
}

export class InvalidActionError extends Error {
  constructor(
    message: string,
    public action: WorkflowAction,
    public currentStatus: WorkflowStatus,
    public code: string = 'INVALID_ACTION'
  ) {
    super(message);
    this.name = 'InvalidActionError';
  }
}
