// =============================================================================
// Admin API Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

// =============================================================================
// Dashboard & Analytics
// =============================================================================

/**
 * GET /api/admin/dashboard
 * Get dashboard summary
 */
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    // Get order counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('orders')
      .select('status');

    if (statusError) throw statusError;

    // Count by status manually
    const counts: Record<string, number> = {};
    statusCounts?.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });

    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('id, total_amount')
      .gte('created_at', today.toISOString());

    if (todayError) throw todayError;

    // Get available riders count
    const { count: availableRiders, error: ridersError } = await supabase
      .from('rider_availability')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'AVAILABLE');

    if (ridersError) throw ridersError;

    // Get active deliveries
    const { count: activeDeliveries, error: activeError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['OUT_FOR_DELIVERY', 'DELIVERY_REQUEST_STARTED', 'RIDER_CONFIRMED_DIGITAL', 'RIDER_CONFIRMED_MANUAL']);

    if (activeError) throw activeError;

    res.json({
      success: true,
      data: {
        order_counts: counts,
        today: {
          total_orders: todayOrders?.length || 0,
          total_revenue: todayOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
        },
        riders: {
          available: availableRiders || 0,
        },
        deliveries: {
          active: activeDeliveries || 0,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching dashboard', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
    });
  }
});

/**
 * GET /api/admin/audit-log
 * Get recent audit log entries
 */
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const { order_id, limit = '50', offset = '0' } = req.query;
    
    let query = supabase
      .from('order_state_transitions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string))
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (order_id) {
      query = query.eq('order_id', order_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error fetching audit log', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log',
    });
  }
});

/**
 * GET /api/admin/webhook-events
 * Get recent webhook events
 */
router.get('/webhook-events', async (req: Request, res: Response) => {
  try {
    const { status, limit = '50' } = req.query;
    
    let query = supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error fetching webhook events', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook events',
    });
  }
});

export default router;