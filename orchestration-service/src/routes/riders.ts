// =============================================================================
// Riders API Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import {
  RiderStatus,
} from '../types/order';

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const updateAvailabilitySchema = z.object({
  status: z.nativeEnum(RiderStatus),
  rider_id: z.string().uuid(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/riders
 * Get all riders with availability
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const { data: riders, error } = await supabase
      .from('riders')
      .select(`
        *,
        availability:rider_availability(*)
      `)
      .eq('is_active', true);

    if (error) {
      logger.error('Error fetching riders', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch riders',
      });
    }

    res.json({
      success: true,
      data: riders,
    });
  } catch (error) {
    logger.error('Error in riders list', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/riders/available
 * Get available riders for assignment
 */
router.get('/available', async (_req: Request, res: Response) => {
  try {
    const { data: riders, error } = await supabase
      .from('rider_availability')
      .select(`
        *,
        rider:riders(*)
      `)
      .eq('status', RiderStatus.AVAILABLE);

    if (error) {
      logger.error('Error fetching available riders', { error });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch available riders',
      });
    }

    res.json({
      success: true,
      data: riders,
    });
  } catch (error) {
    logger.error('Error in available riders list', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/riders/:id
 * Get rider by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const riderId = req.params.id;
    
    const { data: rider, error } = await supabase
      .from('riders')
      .select(`
        *,
        availability:rider_availability(*)
      `)
      .eq('id', riderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Rider not found',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: rider,
    });
  } catch (error) {
    logger.error('Error fetching rider', { error, riderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rider',
    });
  }
});

/**
 * GET /api/riders/:id/orders
 * Get rider's assigned orders
 */
router.get('/:id/orders', async (req: Request, res: Response) => {
  try {
    const riderId = req.params.id;
    const { status } = req.query;
    
    let query = supabase
      .from('orders')
      .select('*')
      .eq('rider_id', riderId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    logger.error('Error fetching rider orders', { error, riderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
    });
  }
});

/**
 * PATCH /api/riders/:id/availability
 * Update rider availability
 */
router.patch('/:id/availability', async (req: Request, res: Response) => {
  try {
    const riderId = req.params.id;
    const validation = updateAvailabilitySchema.safeParse({ ...req.body, rider_id: riderId });
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { status } = validation.data;

    const { data, error } = await supabase
      .from('rider_availability')
      .upsert({
        rider_id: riderId,
        status,
        last_updated: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data,
      message: 'Availability updated',
    });
  } catch (error) {
    logger.error('Error updating rider availability', { error, riderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update availability',
    });
  }
});

export default router;