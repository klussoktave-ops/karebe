// =============================================================================
// State Machine Unit Tests
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { StateMachineService } from '../stateMachine';
import { OrderStatus, ActorType } from '../../types/order';

describe('StateMachineService', () => {
  let stateMachine: StateMachineService;

  beforeEach(() => {
    stateMachine = new StateMachineService();
  });

  describe('validateTransition', () => {
    it('should allow valid transitions', () => {
      const result = stateMachine.validateTransition(
        OrderStatus.CART_DRAFT,
        OrderStatus.ORDER_SUBMITTED,
        ActorType.CUSTOMER
      );
      expect(result.valid).toBe(true);
    });

    it('should reject invalid transitions', () => {
      const result = stateMachine.validateTransition(
        OrderStatus.CART_DRAFT,
        OrderStatus.DELIVERED,
        ActorType.CUSTOMER
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid state transition');
    });

    it('should reject transitions by unauthorized actors', () => {
      const result = stateMachine.validateTransition(
        OrderStatus.ORDER_SUBMITTED,
        OrderStatus.CONFIRMED_BY_MANAGER,
        ActorType.CUSTOMER
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should allow same state transition (no-op)', () => {
      const result = stateMachine.validateTransition(
        OrderStatus.ORDER_SUBMITTED,
        OrderStatus.ORDER_SUBMITTED,
        ActorType.CUSTOMER
      );
      expect(result.valid).toBe(true);
    });

    it('should allow manager confirmation by admin', () => {
      const result = stateMachine.validateTransition(
        OrderStatus.ORDER_SUBMITTED,
        OrderStatus.CONFIRMED_BY_MANAGER,
        ActorType.ADMIN
      );
      expect(result.valid).toBe(true);
    });

    it('should allow rider assignment by admin', () => {
      const result = stateMachine.validateTransition(
        OrderStatus.CONFIRMED_BY_MANAGER,
        OrderStatus.DELIVERY_REQUEST_STARTED,
        ActorType.ADMIN
      );
      expect(result.valid).toBe(true);
    });

    it('should allow digital confirmation by webhook', () => {
      const result = stateMachine.validateTransition(
        OrderStatus.DELIVERY_REQUEST_STARTED,
        OrderStatus.RIDER_CONFIRMED_DIGITAL,
        ActorType.WEBHOOK
      );
      expect(result.valid).toBe(true);
    });

    it('should allow manual confirmation by admin', () => {
      const result = stateMachine.validateTransition(
        OrderStatus.DELIVERY_REQUEST_STARTED,
        OrderStatus.RIDER_CONFIRMED_MANUAL,
        ActorType.ADMIN
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('requiresLock', () => {
    it('should require lock for manager confirmation', () => {
      const requiresLock = stateMachine.requiresLock(
        OrderStatus.ORDER_SUBMITTED,
        OrderStatus.CONFIRMED_BY_MANAGER
      );
      expect(requiresLock).toBe(true);
    });

    it('should require lock for rider assignment', () => {
      const requiresLock = stateMachine.requiresLock(
        OrderStatus.CONFIRMED_BY_MANAGER,
        OrderStatus.DELIVERY_REQUEST_STARTED
      );
      expect(requiresLock).toBe(true);
    });

    it('should not require lock for order submission', () => {
      const requiresLock = stateMachine.requiresLock(
        OrderStatus.CART_DRAFT,
        OrderStatus.ORDER_SUBMITTED
      );
      expect(requiresLock).toBe(false);
    });
  });

  describe('getValidNextStates', () => {
    it('should return valid next states for CART_DRAFT', () => {
      const nextStates = stateMachine.getValidNextStates(OrderStatus.CART_DRAFT);
      expect(nextStates).toContain(OrderStatus.ORDER_SUBMITTED);
    });

    it('should return valid next states for DELIVERY_REQUEST_STARTED', () => {
      const nextStates = stateMachine.getValidNextStates(OrderStatus.DELIVERY_REQUEST_STARTED);
      expect(nextStates).toContain(OrderStatus.RIDER_CONFIRMED_DIGITAL);
      expect(nextStates).toContain(OrderStatus.RIDER_CONFIRMED_MANUAL);
      expect(nextStates).toContain(OrderStatus.CANCELLED);
    });
  });

  describe('isTerminalState', () => {
    it('should identify DELIVERED as terminal', () => {
      expect(stateMachine.isTerminalState(OrderStatus.DELIVERED)).toBe(true);
    });

    it('should identify CANCELLED as terminal', () => {
      expect(stateMachine.isTerminalState(OrderStatus.CANCELLED)).toBe(true);
    });

    it('should not identify ORDER_SUBMITTED as terminal', () => {
      expect(stateMachine.isTerminalState(OrderStatus.ORDER_SUBMITTED)).toBe(false);
    });
  });

  describe('assertValidTransition', () => {
    it('should not throw for valid transition', () => {
      expect(() => {
        stateMachine.assertValidTransition(
          OrderStatus.CART_DRAFT,
          OrderStatus.ORDER_SUBMITTED,
          ActorType.CUSTOMER
        );
      }).not.toThrow();
    });

    it('should throw for invalid transition', () => {
      expect(() => {
        stateMachine.assertValidTransition(
          OrderStatus.CART_DRAFT,
          OrderStatus.DELIVERED,
          ActorType.CUSTOMER
        );
      }).toThrow();
    });
  });
});