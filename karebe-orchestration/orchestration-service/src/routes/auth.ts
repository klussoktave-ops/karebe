// =============================================================================
// Auth API Routes
// RESTful authentication endpoints
// =============================================================================

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import bcrypt from 'bcryptjs';

const router = Router();

// =============================================================================
// Register new admin/superuser
// =============================================================================

/**
 * POST /api/auth/register
 * Register a new admin user.
 * 
 * Body parameters:
 * - email: string (required) - Admin email address
 * - password: string (required) - Password (min 8 characters)
 * - name: string (required) - Full name
 * - phone: string (optional) - Phone number
 * - role: string (optional) - Role (default: 'admin'). Use 'super_admin' for superuser.
 * 
 * Returns:
 * - 201: Successfully created admin
 * - 400: Invalid input or admin already exists
 * - 409: Email already registered
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role = 'admin' } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
        fields: {
          email: !email ? 'Email is required' : undefined,
          password: !password ? 'Password is required' : undefined,
          name: !name ? 'Name is required' : undefined,
        }
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
      });
    }

    // Validate role
    const allowedRoles = ['admin', 'super_admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    logger.info('Registration attempt', { email: email.toLowerCase(), role });

    // Check if email already exists
    const { data: existingAdmin, error: existingError } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingAdmin) {
      logger.warn('Registration failed - email already exists', { email: email.toLowerCase() });
      return res.status(409).json({
        success: false,
        error: 'An admin with this email already exists',
      });
    }

    // If trying to create super_admin, check if one already exists
    if (role === 'super_admin') {
      const { count, error: countError } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin');

      if (countError) {
        logger.error('Error checking for existing super_admin', { error: countError });
        return res.status(500).json({
          success: false,
          error: 'Registration failed. Please try again.',
        });
      }

      if (count && count > 0) {
        logger.warn('Registration failed - super_admin already exists');
        return res.status(403).json({
          success: false,
          error: 'A super admin already exists. Please contact existing super admin to create additional users.',
        });
      }
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the admin user
    const { data: adminUser, error: insertError } = await supabase
      .from('admin_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        phone: phone || null,
        role,
        is_active: true,
      })
      .select('id, email, name, role, phone')
      .single();

    if (insertError) {
      logger.error('Error creating admin user', { error: insertError });
      
      if (insertError.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'An admin with this email already exists',
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create admin user',
      });
    }

    logger.info('Admin registration successful', { 
      adminId: adminUser.id, 
      email: adminUser.email,
      role: adminUser.role
    });

    res.status(201).json({
      success: true,
      message: `Admin user created successfully as ${role}`,
      data: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    });
  } catch (error) {
    logger.error('Admin registration error', { error });
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
    });
  }
});

// =============================================================================
// Export
// =============================================================================

export default router;