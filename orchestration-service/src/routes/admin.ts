// =============================================================================
// Admin API Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

// =============================================================================
// Admin Login
// =============================================================================

/**
 * POST /api/admin/login
 * Admin user login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // For demo purposes, check against demo accounts
    const demoAdmins: Record<string, { password: string; name: string; role: string }> = {
      'admin@karebe.com': { password: 'admin123', name: 'Main Admin', role: 'super_admin' },
      'manager@karebe.com': { password: 'manager123', name: 'Store Manager', role: 'manager' },
    };

    const admin = demoAdmins[email.toLowerCase()];
    
    if (!admin || admin.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Get admin user from database
    const { data: adminUser, error: dbError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      logger.error('Error fetching admin user', { error: dbError });
    }

    res.json({
      success: true,
      data: {
        id: adminUser?.id || 'demo-admin-id',
        email: email.toLowerCase(),
        name: admin.name,
        role: admin.role,
        token: 'demo-token-' + Date.now(),
      },
    });
  } catch (error) {
    logger.error('Admin login error', { error });
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

// =============================================================================
// Admin Users Management
// =============================================================================

/**
 * GET /api/admin/admins
 * Get all admin users
 */
router.get('/admins', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, name, phone, role, branch_id, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error fetching admin users', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin users',
    });
  }
});

/**
 * POST /api/admin/admins
 * Create a new admin user
 */
router.post('/admins', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role = 'admin', branch_id } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
    }

    // Simple password hashing (in production, use bcrypt)
    const passwordHash = `$2a$10${Buffer.from(password).toString('base64').substring(0, 22)}`;

    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        phone,
        role,
        branch_id,
        is_active: true,
      })
      .select('id, email, name, phone, role, branch_id, is_active')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'An admin with this email already exists',
        });
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error creating admin user', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create admin user',
    });
  }
});

/**
 * PUT /api/admin/admins/:id
 * Update an admin user
 */
router.put('/admins/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, phone, role, branch_id, is_active, password } = req.body;

    const updateData: Record<string, unknown> = {
      email,
      name,
      phone,
      role,
      branch_id,
      is_active,
      updated_at: new Date().toISOString(),
    };

    // Only update password if provided
    if (password) {
      updateData.password_hash = `$2a$10${Buffer.from(password).toString('base64').substring(0, 22)}`;
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const { data, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
      .select('id, email, name, phone, role, branch_id, is_active')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'An admin with this email already exists',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error updating admin user', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update admin user',
    });
  }
});

/**
 * DELETE /api/admin/admins/:id
 * Delete an admin user
 */
router.delete('/admins/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    logger.info('DELETE admin request received', { 
      adminId: id, 
      params: req.params,
      path: req.path,
      originalUrl: req.originalUrl 
    });

    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Supabase delete error', { error, adminId: id });
      throw error;
    }

    logger.info('Admin deleted successfully', { adminId: id });
    res.json({
      success: true,
      message: 'Admin user deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting admin user', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete admin user',
    });
  }
});

/**
 * PATCH /api/admin/admins/:id/toggle-active
 * Toggle admin user active status
 */
router.patch('/admins/:id/toggle-active', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First get current status
    const { data: existing, error: fetchError } = await supabase
      .from('admin_users')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('admin_users')
      .update({ is_active: !existing.is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, email, name, phone, role, branch_id, is_active')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error toggling admin user status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to toggle admin user status',
    });
  }
});

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

// =============================================================================
// Branches Management
// =============================================================================

/**
 * GET /api/admin/branches
 * Get all branches
 */
router.get('/branches', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error fetching branches', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branches',
    });
  }
});

/**
 * POST /api/admin/branches
 * Create a new branch
 */
router.post('/branches', async (req: Request, res: Response) => {
  try {
    const { name, address, phone, is_main, is_active, mpesa_shortcode, mpesa_payment_type } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Branch name is required',
      });
    }

    // If this branch is main, unset other main branches
    if (is_main) {
      await supabase
        .from('branches')
        .update({ is_main: false })
        .eq('is_main', true);
    }

    const { data, error } = await supabase
      .from('branches')
      .insert({
        name,
        address,
        phone,
        is_main: is_main || false,
        is_active: is_active !== false,
        mpesa_shortcode,
        mpesa_payment_type,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error creating branch', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create branch',
    });
  }
});

/**
 * PUT /api/admin/branches
 * Update a branch (or set as main)
 */
router.put('/branches', async (req: Request, res: Response) => {
  try {
    const { id, name, address, phone, is_main, is_active, mpesa_shortcode, mpesa_payment_type } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required',
      });
    }

    // If setting as main, unset other main branches first
    if (is_main) {
      await supabase
        .from('branches')
        .update({ is_main: false })
        .eq('is_main', true)
        .neq('id', id);
    }

    const updateData: Record<string, unknown> = {
      name,
      address,
      phone,
      is_main: is_main || false,
      is_active: is_active !== false,
      mpesa_shortcode,
      mpesa_payment_type,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const { data, error } = await supabase
      .from('branches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error updating branch', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update branch',
    });
  }
});

/**
 * DELETE /api/admin/branches
 * Delete a branch
 */
router.delete('/branches', async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required',
      });
    }

    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Branch deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting branch', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete branch',
    });
  }
});

// =============================================================================
// Riders Management (Admin)
// =============================================================================

/**
 * GET /api/admin/riders
 * Get all riders (admin view)
 */
router.get('/riders', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error fetching riders', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch riders',
    });
  }
});

/**
 * POST /api/admin/riders
 * Create a new rider
 */
router.post('/riders', async (req: Request, res: Response) => {
  try {
    const { full_name, name, phone, whatsapp_number, branch_id, pin, is_active } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    // Generate a random PIN if not provided
    const riderPin = pin || Math.floor(1000 + Math.random() * 9000).toString();

    const { data, error } = await supabase
      .from('riders')
      .insert({
        full_name: full_name || name || phone,
        phone,
        whatsapp_number: whatsapp_number || phone,
        branch_id: branch_id || null,
        pin: riderPin,
        is_active: is_active !== false,
        status: 'AVAILABLE',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'A rider with this phone number already exists',
        });
      }
      throw error;
    }

    res.status(201).json({
      success: true,
      data,
      pin: riderPin,
    });
  } catch (error) {
    logger.error('Error creating rider', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create rider',
    });
  }
});

/**
 * PUT /api/admin/riders
 * Update a rider (toggle active status or update details)
 */
router.put('/riders', async (req: Request, res: Response) => {
  try {
    const { id, full_name, name, phone, whatsapp_number, branch_id, is_active, pin } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Rider ID is required',
      });
    }

    const updateData: Record<string, unknown> = {
      full_name: full_name || name,
      phone,
      whatsapp_number: whatsapp_number,
      branch_id: branch_id || null,
      is_active: is_active,
      pin,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const { data, error } = await supabase
      .from('riders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error updating rider', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update rider',
    });
  }
});

/**
 * DELETE /api/admin/riders
 * Delete a rider
 */
router.delete('/riders', async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Rider ID is required',
      });
    }

    const { error } = await supabase
      .from('riders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Rider deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting rider', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to delete rider',
    });
  }
});

export default router;