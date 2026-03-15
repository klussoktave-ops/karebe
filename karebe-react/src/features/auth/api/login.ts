import { supabase } from '@/lib/supabase';
import type { AuthUser, UserRole } from '../stores/auth-store';
import { normalizePhone, safeParsePhone } from '@/lib/phone';

// Railway API URL
const ORCHESTRATION_API = import.meta.env.VITE_ORCHESTRATION_API_URL || 'https://karebe-orchestration-production.up.railway.app';

export interface LoginCredentials {
  username: string;
  password: string;
  role?: 'admin' | 'rider';
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

/**
 * Admin/Staff login via the API
 * This is used for admin, super-admin, and rider logins
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  console.log('[Login API] Starting login process for username:', credentials.username);
  console.log('[Login API] Role:', credentials.role || 'admin (default)');
  
  // If Supabase is not configured, return error
  if (!isSupabaseConfigured) {
    console.error('[Login API] Supabase not configured - cannot authenticate');
    return {
      success: false,
      message: 'Authentication service not configured. Please contact support.',
    };
  }

  // Use the correct endpoint based on role
  const isRider = credentials.role === 'rider';
  const endpoint = isRider ? '/api/riders/login' : '/api/admin/login';
  
  // Format the request body based on role
  const requestBody = isRider
    ? { phone: credentials.username, pin: credentials.password }
    : { email: credentials.username, password: credentials.password };

  console.log('[Login API] Calling API endpoint:', endpoint);
  console.log('[Login API] Request body:', { ...requestBody, password: '***', pin: '***' });

  try {
    const response = await fetch(`${ORCHESTRATION_API}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[Login API] Received response - status:', response.status, 'data:', data);

    if (!response.ok || (!data.success && !data.ok)) {
      const errorMsg = data.error || data.message || 'Login failed. Please check your credentials.';
      console.error('[Login API] Login failed - Response status:', response.status, 'Error:', errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    }

    // Map the API response to our AuthUser type
    console.log('[Login API] Login successful, processing user data...');
    
    // Handle rider response vs admin response
    const userData = isRider
      ? (data.rider || data.data || data.user)
      : (data.user || data.data || data.admin);

    if (!userData) {
      return {
        success: false,
        message: 'Login succeeded but no user data was returned.',
      };
    }

    const role = isRider ? 'rider' : (userData.role || data.role || 'admin');
    
    const user: AuthUser = {
      id: userData.id,
      email: userData.email || (isRider ? userData.phone : '') || '',
      username: isRider ? userData.phone : userData.username || userData.email,
      name: userData.name || (isRider ? userData.phone : ''),
      role: role as UserRole,
      phone: userData.phone,
      branchId: userData.branch_id || userData.branchId,
      avatar: userData.avatar,
    };

    console.log('[Login API] User mapped:', { id: user.id, role: user.role, name: user.name });

    return {
      success: true,
      user,
      token: data.token,
    };
  } catch (error) {
    console.error('[Login API] EXCEPTION during login:');
    console.error('[Login API] Error:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
    };
  }
}

/**
 * Customer login/registration via phone
 * Creates or retrieves a customer profile
 */
export async function customerLogin(phone: string): Promise<LoginResponse> {
  try {
    // Use centralized phone utility for consistent normalization
    const normalized = normalizePhone(phone);
    if (!normalized.success) {
      return {
        success: false,
        message: 'Invalid phone number format. Please enter a valid Kenyan mobile number.',
      };
    }
    const formattedPhone = normalized.data;

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

/**
 * Rider login via phone + PIN
 * Validates rider credentials and returns rider data
 */
export interface RiderLoginCredentials {
  phone: string;
  pin: string;
}

export interface RiderLoginResponse {
  ok: boolean;
  rider?: {
    id: string;
    name: string;
    phone: string;
    branch_id: string;
    branch?: any;
  };
  error?: string;
}

export async function riderLogin(credentials: RiderLoginCredentials): Promise<RiderLoginResponse> {
  try {
    const response = await fetch(`${ORCHESTRATION_API}/api/riders/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || 'Invalid phone or PIN',
      };
    }

    return {
      ok: true,
      rider: data.rider,
    };
  } catch (error) {
    console.error('Rider login error:', error);
    return {
      ok: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
