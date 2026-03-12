import { supabase } from '@/lib/supabase';

/**
 * Force clear all storage
 */
function clearAllStorage() {
  // Clear sessionStorage completely
  sessionStorage.clear();
  
  // Clear localStorage items used by the app
  const keysToRemove = [
    'karebe-auth',       // Auth store persisted state
    'karebe-cart',       // Cart store persisted state
    'karebe-demo-cart',  // Demo cart
    'karebe-branch',     // Branch selection
  ];
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignore errors for individual key removal
    }
  });
}

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
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn('Supabase signout error (non-critical):', error);
        // Continue with local logout even if Supabase fails
      }
    }

    // Clear ALL storage including auth store, cart, and any other persisted state
    // This ensures complete session cleanup between different user roles
    clearAllStorage();

    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error) {
    console.error('Logout error:', error);
    // Even on error, we consider logout successful locally
    // since the client-side state will be cleared
    
    // Force clear storage on error too
    clearAllStorage();
    
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
    if (!supabase) {
      return false;
    }
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
