// =============================================================================
// State Machine Service
// Validates and executes order state transitions
// =============================================================================

import {
  OrderStatus,
  ActorType,
  Order,
  ValidStateTransition,
  StateTransitionError,
} from '../types/order';

// =============================================================================
// Valid State Transitions Configuration
// =============================================================================

const VALID_TRANSITIONS: ValidStateTransition[] = [
  // Initial submission
  { from_status: null, to_status: OrderStatus.CART_DRAFT, allowed_actors: [ActorType.CUSTOMER, ActorType.SYSTEM], requires_lock: false, description: 'New cart created' },
  { from_status: OrderStatus.CART_DRAFT, to_status: OrderStatus.ORDER_SUBMITTED, allowed_actors: [ActorType.CUSTOMER, ActorType.SYSTEM], requires_lock: false, description: 'Customer clicked call button' },

  // Manager confirmation
  { from_status: OrderStatus.ORDER_SUBMITTED, to_status: OrderStatus.CONFIRMED_BY_MANAGER, allowed_actors: [ActorType.ADMIN], requires_lock: true, description: 'Manager confirmed inventory' },
  { from_status: OrderStatus.ORDER_SUBMITTED, to_status: OrderStatus.CANCELLED, allowed_actors: [ActorType.ADMIN, ActorType.CUSTOMER], requires_lock: false, description: 'Order cancelled' },

  // Rider assignment
  { from_status: OrderStatus.CONFIRMED_BY_MANAGER, to_status: OrderStatus.DELIVERY_REQUEST_STARTED, allowed_actors: [ActorType.ADMIN], requires_lock: true, description: 'Admin assigned rider' },
  { from_status: OrderStatus.CONFIRMED_BY_MANAGER, to_status: OrderStatus.CANCELLED, allowed_actors: [ActorType.ADMIN, ActorType.CUSTOMER], requires_lock: false, description: 'Order cancelled' },

  // Rider confirmation (hybrid paths)
  { from_status: OrderStatus.DELIVERY_REQUEST_STARTED, to_status: OrderStatus.RIDER_CONFIRMED_DIGITAL, allowed_actors: [ActorType.RIDER, ActorType.WEBHOOK], requires_lock: true, description: 'Rider confirmed via WhatsApp' },
  { from_status: OrderStatus.DELIVERY_REQUEST_STARTED, to_status: OrderStatus.RIDER_CONFIRMED_MANUAL, allowed_actors: [ActorType.ADMIN], requires_lock: true, description: 'Admin marked rider confirmed after phone call' },
  { from_status: OrderStatus.DELIVERY_REQUEST_STARTED, to_status: OrderStatus.CANCELLED, allowed_actors: [ActorType.ADMIN, ActorType.CUSTOMER], requires_lock: false, description: 'Order cancelled' },

  // Out for delivery
  { from_status: OrderStatus.RIDER_CONFIRMED_DIGITAL, to_status: OrderStatus.OUT_FOR_DELIVERY, allowed_actors: [ActorType.RIDER, ActorType.WEBHOOK, ActorType.ADMIN], requires_lock: true, description: 'Rider started delivery' },
  { from_status: OrderStatus.RIDER_CONFIRMED_MANUAL, to_status: OrderStatus.OUT_FOR_DELIVERY, allowed_actors: [ActorType.ADMIN], requires_lock: true, description: 'Rider started delivery (manual)' },
  { from_status: OrderStatus.RIDER_CONFIRMED_DIGITAL, to_status: OrderStatus.CANCELLED, allowed_actors: [ActorType.ADMIN], requires_lock: false, description: 'Order cancelled' },
  { from_status: OrderStatus.RIDER_CONFIRMED_MANUAL, to_status: OrderStatus.CANCELLED, allowed_actors: [ActorType.ADMIN], requires_lock: false, description: 'Order cancelled' },

  // Delivery complete
  { from_status: OrderStatus.OUT_FOR_DELIVERY, to_status: OrderStatus.DELIVERED, allowed_actors: [ActorType.RIDER, ActorType.WEBHOOK, ActorType.ADMIN], requires_lock: false, description: 'Order delivered' },
  { from_status: OrderStatus.OUT_FOR_DELIVERY, to_status: OrderStatus.CANCELLED, allowed_actors: [ActorType.ADMIN], requires_lock: false, description: 'Order cancelled' },
];

// =============================================================================
// State Machine Service
// =============================================================================

export class StateMachineService {
  private transitions: Map<string, ValidStateTransition>;

  constructor() {
    this.transitions = new Map();
    this.buildTransitionMap();
  }

  private buildTransitionMap(): void {
    for (const transition of VALID_TRANSITIONS) {
      const key = this.getTransitionKey(transition.from_status, transition.to_status);
      this.transitions.set(key, transition);
    }
  }

  private getTransitionKey(from: OrderStatus | null, to: OrderStatus): string {
    return `${from || 'null'}->${to}`;
  }

  /**
   * Validate if a state transition is allowed
   */
  validateTransition(
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    actorType: ActorType
  ): { valid: boolean; transition?: ValidStateTransition; error?: string } {
    // Same status is always valid (no-op)
    if (fromStatus === toStatus) {
      return { valid: true };
    }

    const key = this.getTransitionKey(fromStatus, toStatus);
    const transition = this.transitions.get(key);

    if (!transition) {
      return {
        valid: false,
        error: `Invalid state transition: ${fromStatus || 'null'} -> ${toStatus}`,
      };
    }

    if (!transition.allowed_actors.includes(actorType)) {
      return {
        valid: false,
        error: `Actor type '${actorType}' not allowed for transition ${fromStatus || 'null'} -> ${toStatus}. Allowed: ${transition.allowed_actors.join(', ')}`,
      };
    }

    return { valid: true, transition };
  }

  /**
   * Check if a transition requires a lock
   */
  requiresLock(fromStatus: OrderStatus | null, toStatus: OrderStatus): boolean {
    const key = this.getTransitionKey(fromStatus, toStatus);
    const transition = this.transitions.get(key);
    return transition?.requires_lock ?? false;
  }

  /**
   * Get all valid next states from a given state
   */
  getValidNextStates(fromStatus: OrderStatus | null): OrderStatus[] {
    const nextStates: OrderStatus[] = [];
    
    for (const transition of VALID_TRANSITIONS) {
      if (transition.from_status === fromStatus) {
        nextStates.push(transition.to_status);
      }
    }
    
    return nextStates;
  }

  /**
   * Get all allowed actors for a transition
   */
  getAllowedActors(fromStatus: OrderStatus | null, toStatus: OrderStatus): ActorType[] {
    const key = this.getTransitionKey(fromStatus, toStatus);
    const transition = this.transitions.get(key);
    return transition?.allowed_actors ?? [];
  }

  /**
   * Get transition description
   */
  getTransitionDescription(fromStatus: OrderStatus | null, toStatus: OrderStatus): string {
    const key = this.getTransitionKey(fromStatus, toStatus);
    const transition = this.transitions.get(key);
    return transition?.description ?? 'Unknown transition';
  }

  /**
   * Assert that a transition is valid (throws on invalid)
   */
  assertValidTransition(
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    actorType: ActorType
  ): ValidStateTransition {
    const result = this.validateTransition(fromStatus, toStatus, actorType);
    
    if (!result.valid) {
      throw new StateTransitionError(
        result.error!,
        fromStatus!,
        toStatus
      );
    }
    
    return result.transition!;
  }

  /**
   * Check if an order is in a terminal state
   */
  isTerminalState(status: OrderStatus): boolean {
    return status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED;
  }

  /**
   * Get the full state flow for visualization/documentation
   */
  getStateFlow(): Array<{ from: OrderStatus | null; to: OrderStatus; description: string }> {
    return VALID_TRANSITIONS.map(t => ({
      from: t.from_status,
      to: t.to_status,
      description: t.description,
    }));
  }
}

// Singleton instance
export const stateMachine = new StateMachineService();