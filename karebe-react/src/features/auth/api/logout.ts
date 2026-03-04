import { supabase } from '@/lib/supabase';

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

/**
 * Logout the current user
 * Clears both the API session and Supabase session
 */
export async function logout(): Promise<LogoutResponse> {
  try {
    // Sign out from Supabase (for customer sessions)
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.warn('Supabase signout error (non-critical):', error);
      // Continue with local logout even if Supabase fails
    }

    // Clear any additional session data from local/session storage
    // The auth store's persist middleware handles sessionStorage clearing
    // when logout action is dispatched

    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error) {
    console.error('Logout error:', error);
    // Even on error, we consider logout successful locally
    // since the client-side state will be cleared
    return {
      success: true,
      message: 'Logged out locally',
    };
  }
}

/**
 * Check if user session is still valid
 * Used for session validation on app load
 */
export async function validateSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Session validation error:', error);
      return false;
    }

    return !!session;
  } catch (error) {
    console.error('Validate session error:', error);
    return false;
  }
}
