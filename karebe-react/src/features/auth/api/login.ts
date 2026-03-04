import { supabase } from '@/lib/supabase';
import { demoUsers } from '@/lib/demo-data';
import type { AuthUser, UserRole } from '../stores/auth-store';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
  token?: string;
}

// Check if Supabase is configured with real credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('your-project');

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Demo login using demo users
 */
async function demoLogin(credentials: LoginCredentials): Promise<LoginResponse> {
  await delay(300);

  const user = demoUsers.find(
    u => u.email === credentials.username && u.password === credentials.password
  );

  if (!user) {
    return {
      success: false,
      message: 'Invalid email or password. Try: owner@karebe.com / owner123',
    };
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    username: user.email,
    name: user.name,
    role: user.role as UserRole,
    phone: user.phone,
    branchId: user.branchId,
    avatar: user.avatar,
  };

  return {
    success: true,
    user: authUser,
    token: `demo-token-${user.id}`,
  };
}

/**
 * Admin/Staff login via the API
 * This is used for admin, super-admin, and rider logins
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  // Use demo auth if Supabase is not configured
  if (!isSupabaseConfigured) {
    return demoLogin(credentials);
  }

  try {
    // Call the admin login API endpoint
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Login failed. Please check your credentials.',
      };
    }

    // Map the API response to our AuthUser type
    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || '',
      username: data.user.username,
      name: data.user.name || data.user.username,
      role: data.user.role as UserRole,
      phone: data.user.phone,
      branchId: data.user.branch_id,
      avatar: data.user.avatar,
    };

    return {
      success: true,
      user,
      token: data.token,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Customer login/registration via phone
 * Creates or retrieves a customer profile
 */
export async function customerLogin(phone: string): Promise<LoginResponse> {
  try {
    // Format phone number
    const formattedPhone = phone.startsWith('+') ? phone : `+254${phone.replace(/^0/, '')}`;

    // Check if customer profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('phone', formattedPhone)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    let profile = existingProfile;

    // Create new profile if doesn't exist
    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from('customer_profiles')
        .insert({
          phone: formattedPhone,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      profile = newProfile;
    }

    const user: AuthUser = {
      id: profile.id,
      email: '',
      username: formattedPhone,
      name: profile.name || formattedPhone,
      role: 'customer',
      phone: formattedPhone,
    };

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error('Customer login error:', error);
    return {
      success: false,
      message: 'Failed to login. Please try again.',
    };
  }
}
