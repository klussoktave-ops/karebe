// =============================================================================
// Order State Machine Types
// =============================================================================

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
  status: OrderStatus;
  customer_phone: string;
  customer_name?: string;
  customer_email?: string;
  delivery_address: string;
  delivery_notes?: string;
  branch_id: string;
  rider_id?: string;
  total_amount: number;
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
// API Request/Response Types
// =============================================================================

export interface CreateOrderRequest {
  customer_phone: string;
  customer_name?: string;
  delivery_address: string;
  delivery_notes?: string;
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
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  actor_type: ActorType;
  actor_id: string;
  confirmation_method?: ConfirmationMethod;
  metadata?: Record<string, unknown>;
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