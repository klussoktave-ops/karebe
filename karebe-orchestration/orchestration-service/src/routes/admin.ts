// =============================================================================
// Admin API Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import bcrypt from 'bcryptjs';

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

    logger.info('Admin login attempt', { email: email.toLowerCase() });

    // Query admin user from database
    const { data: adminUser, error: dbError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (dbError || !adminUser) {
      logger.warn('Admin login failed - user not found', { email: email.toLowerCase(), error: dbError?.message });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!adminUser.is_active) {
      logger.warn('Admin login failed - account inactive', { email: email.toLowerCase() });
      return res.status(401).json({
        success: false,
        error: 'Account is disabled. Please contact support.',
      });
    }

    // Verify password using bcrypt
    let isValidPassword = false;
    let needsPasswordMigration = false;
    
    // First check bcrypt hash (proper way - starts with $2)
    if (adminUser.password_hash && adminUser.password_hash.startsWith('$2')) {
      isValidPassword = await bcrypt.compare(password, adminUser.password_hash);
    } else if (adminUser.password_hash) {
      // Legacy: check direct hash match for demo accounts
      isValidPassword = adminUser.password_hash === password;
      if (isValidPassword) {
        needsPasswordMigration = true;
      }
    }
    
    // Fallback: check plain password (for legacy demo accounts - migrate on login)
    if (!isValidPassword && adminUser.password) {
      isValidPassword = adminUser.password === password;
      if (isValidPassword) {
        needsPasswordMigration = true;
      }
    }

    if (!isValidPassword) {
      logger.warn('Admin login failed - invalid password', { email: email.toLowerCase() });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Auto-migrate legacy passwords to bcrypt on successful login
    if (needsPasswordMigration && adminUser.id) {
      const newPasswordHash = await bcrypt.hash(password, 10);
      await supabase
        .from('admin_users')
        .update({ 
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminUser.id);
      
      logger.info('Migrated legacy password to bcrypt', { email: email.toLowerCase() });
    }

    logger.info('Admin login successful', { 
      email: adminUser.email, 
      role: adminUser.role,
      name: adminUser.name 
    });

    res.json({
      success: true,
      data: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        phone: adminUser.phone,
        branch_id: adminUser.branch_id,
        token: 'admin-token-' + Date.now(),
      },
    });
  } catch (error) {
    logger.error('Admin login error', { error });
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
    });
  }
});

// =============================================================================
// One-Time Admin Setup (for initial deployment)
// =============================================================================

/**
 * POST /api/admin/setup
 * One-time setup to create the first super admin.
 * Only works when no admin users exist in the system.
 * After first admin is created, this route becomes inactive.
 */
router.post('/setup', async (req: Request, res: Response) => {
  try {
    console.log('[AdminSetup] Received setup request');
    const { email, password, name, phone } = req.body;
    
    console.log('[AdminSetup] Request body:', { email, name, phone: phone || 'not provided' });

    if (!email || !password || !name) {
      console.log('[AdminSetup] Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      console.log('[AdminSetup] Password too short');
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
      });
    }

    // Check if any admin users already exist
    console.log('[AdminSetup] Checking for existing admins...');
    const { count, error: countError } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true });

    console.log('[AdminSetup] Admin count:', count, 'Error:', countError);

    if (countError) {
      logger.error('Error checking for existing admins', { error: countError });
      return res.status(500).json({
        success: false,
        error: 'Setup failed. Please try again.',
      });
    }

    // If admins already exist, reject the setup request (return 404 to hide endpoint existence)
    if (count && count > 0) {
      console.log('[AdminSetup] Admins already exist, count:', count);
      logger.warn('Admin setup attempted but admins already exist', { count });
      return res.status(404).json({
        success: false,
        error: 'Resource not found',
      });
    }

    console.log('[AdminSetup] No admins found, proceeding with setup...');
    logger.info('Starting one-time admin setup', { email: email.toLowerCase() });

    // Hash password with bcrypt
    console.log('[AdminSetup] Hashing password with bcrypt...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the first super admin
    console.log('[AdminSetup] Creating admin user...');
    const { data: adminUser, error: insertError } = await supabase
      .from('admin_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        phone,
        role: 'super_admin',
        is_active: true,
      })
      .select('id, email, name, role, phone')
      .single();

    if (insertError) {
      console.log('[AdminSetup] Error creating admin:', insertError);
      logger.error('Error creating initial admin', { error: insertError });
      
      if (insertError.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'An admin with this email already exists',
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create admin user',
      });
    }

    logger.info('Initial admin setup completed successfully', { 
      adminId: adminUser.id, 
      email: adminUser.email 
    });

    res.status(201).json({
      success: true,
      message: 'Admin setup completed successfully. You can now login.',
      data: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    });
  } catch (error) {
    logger.error('Admin setup error', { error });
    res.status(500).json({
      success: false,
      error: 'Setup failed. Please try again.',
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

    // Hash password properly with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

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

async function updateAdminUser(id: string, req: Request, res: Response) {
  try {
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

    // Only update password if provided - use proper bcrypt hashing
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
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
}

/**
 * PUT /api/admin/admins
 * Update an admin user (expects id in body for legacy clients)
 */
router.put('/admins', async (req: Request, res: Response) => {
  const id = req.body?.id ?? req.body?.adminId ?? req.body?.admin_id;
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Admin id is required',
    });
  }

  return updateAdminUser(String(id), req, res);
});

/**
 * PUT /api/admin/admins/:id
 * Update an admin user
 */
router.put('/admins/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  return updateAdminUser(id, req, res);
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
