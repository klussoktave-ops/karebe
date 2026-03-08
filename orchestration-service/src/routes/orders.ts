// =============================================================================
// Orders API Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { orderService } from '../services/orderService';
import { logger } from '../lib/logger';
import {
  OrderStatus,
  ActorType,
  ConfirmationMethod,
} from '../types/order';

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const createOrderSchema = z.object({
  customer_phone: z.string().min(10).max(20),
  customer_name: z.string().optional(),
  delivery_address: z.string().min(5),
  delivery_notes: z.string().optional(),
  branch_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    product_name: z.string(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    variant: z.string().optional(),
  })).min(1),
  trigger_source: z.enum(['call_button', 'cart_checkout', 'whatsapp']),
  idempotency_key: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  actor_type: z.nativeEnum(ActorType),
  actor_id: z.string().uuid(),
  confirmation_method: z.nativeEnum(ConfirmationMethod).optional(),
  expected_version: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const assignRiderSchema = z.object({
  rider_id: z.string().uuid(),
  admin_id: z.string().uuid(),
  notes: z.string().optional(),
});

const confirmRiderSchema = z.object({
  confirmation_method: z.nativeEnum(ConfirmationMethod),
  actor_type: z.nativeEnum(ActorType),
  actor_id: z.string().uuid(),
  notes: z.string().optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/orders
 * Create new order (from call button)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const order = await orderService.createOrder(validation.data);
    
    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully',
    });
  } catch (error) {
    logger.error('Error creating order', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/orders/:id
 * Get order by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const order = await orderService.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Error getting order', { error, orderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get order',
    });
  }
});

/**
 * GET /api/orders
 * Get orders by status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, branch_id } = req.query;
    
    if (!status || !Object.values(OrderStatus).includes(status as OrderStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status query parameter required',
      });
    }

    const orders = await orderService.getOrdersByStatus(
      status as OrderStatus,
      branch_id as string | undefined
    );

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    logger.error('Error getting orders', { error, query: req.query });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to get orders',
      details: errorMessage,
    });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Update order status
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const validation = updateStatusSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const order = await orderService.updateOrderStatus(orderId, validation.data);
    
    res.json({
      success: true,
      data: order,
      message: 'Order status updated',
    });
  } catch (error) {
    logger.error('Error updating order status', { error, orderId: req.params.id, body: req.body });
    
    if (error instanceof Error) {
      if (error.name === 'StateTransitionError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid state transition',
          message: error.message,
        });
      }
      if (error.name === 'RaceConditionError') {
        return res.status(409).json({
          success: false,
          error: 'Race condition detected',
          message: error.message,
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
    });
  }
});

/**
 * POST /api/orders/:id/assign-rider
 * Assign rider to order
 */
router.post('/:id/assign-rider', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const validation = assignRiderSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const order = await orderService.assignRider(orderId, validation.data);
    
    res.json({
      success: true,
      data: order,
      message: 'Rider assigned successfully',
    });
  } catch (error) {
    logger.error('Error assigning rider', { error, orderId: req.params.id, body: req.body });
    
    if (error instanceof Error) {
      if (error.name === 'RiderUnavailableError') {
        return res.status(400).json({
          success: false,
          error: 'Rider unavailable',
          message: error.message,
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to assign rider',
    });
  }
});

/**
 * POST /api/orders/:id/confirm-rider
 * Confirm rider (digital or manual)
 */
router.post('/:id/confirm-rider', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const validation = confirmRiderSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const order = await orderService.confirmRider(orderId, validation.data);
    
    res.json({
      success: true,
      data: order,
      message: 'Rider confirmed successfully',
    });
  } catch (error) {
    logger.error('Error confirming rider', { error, orderId: req.params.id, body: req.body });
    
    if (error instanceof Error) {
      if (error.name === 'StateTransitionError') {
        return res.status(400).json({
          success: false,
          error: 'Invalid state transition',
          message: error.message,
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to confirm rider',
    });
  }
});

/**
 * POST /api/orders/:id/start-delivery
 * Mark order as out for delivery
 */
router.post('/:id/start-delivery', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { actor_type, actor_id } = req.body;
    
    if (!actor_type || !actor_id) {
      return res.status(400).json({
        success: false,
        error: 'actor_type and actor_id required',
      });
    }

    const order = await orderService.startDelivery(orderId, actor_type, actor_id);
    
    res.json({
      success: true,
      data: order,
      message: 'Delivery started',
    });
  } catch (error) {
    logger.error('Error starting delivery', { error, orderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to start delivery',
    });
  }
});

/**
 * POST /api/orders/:id/complete
 * Mark order as delivered
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { actor_type, actor_id } = req.body;
    
    if (!actor_type || !actor_id) {
      return res.status(400).json({
        success: false,
        error: 'actor_type and actor_id required',
      });
    }

    const order = await orderService.completeDelivery(orderId, actor_type, actor_id);
    
    res.json({
      success: true,
      data: order,
      message: 'Order completed successfully',
    });
  } catch (error) {
    logger.error('Error completing order', { error, orderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to complete order',
    });
  }
});

/**
 * POST /api/orders/:id/cancel
 * Cancel order
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { actor_type, actor_id, reason } = req.body;
    
    if (!actor_type || !actor_id) {
      return res.status(400).json({
        success: false,
        error: 'actor_type and actor_id required',
      });
    }

    const order = await orderService.cancelOrder(orderId, actor_type, actor_id, reason);
    
    res.json({
      success: true,
      data: order,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling order', { error, orderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
    });
  }
});

/**
 * GET /api/orders/:id/history
 * Get order audit trail
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const history = await orderService.getOrderHistory(orderId);
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Error getting order history', { error, orderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get order history',
    });
  }
});

/**
 * POST /api/orders/:id/lock
 * Acquire lock on order
 */
router.post('/:id/lock', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { admin_id, session_id } = req.body;
    
    if (!admin_id) {
      return res.status(400).json({
        success: false,
        error: 'admin_id required',
      });
    }

    const locked = await orderService.acquireLock(orderId, admin_id, session_id);
    
    if (!locked) {
      return res.status(423).json({
        success: false,
        error: 'Order is locked by another admin',
      });
    }

    res.json({
      success: true,
      message: 'Lock acquired',
    });
  } catch (error) {
    logger.error('Error acquiring lock', { error, orderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to acquire lock',
    });
  }
});

/**
 * DELETE /api/orders/:id/lock
 * Release lock on order
 */
router.delete('/:id/lock', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { admin_id } = req.body;
    
    if (!admin_id) {
      return res.status(400).json({
        success: false,
        error: 'admin_id required',
      });
    }

    const released = await orderService.releaseLock(orderId, admin_id);
    
    res.json({
      success: released,
      message: released ? 'Lock released' : 'Lock not found or not owned by this admin',
    });
  } catch (error) {
    logger.error('Error releasing lock', { error, orderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to release lock',
    });
  }
});

export default router;