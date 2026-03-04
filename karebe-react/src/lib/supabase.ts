import { createClient } from '@supabase/supabase-js';

// Get env vars - these come from Vercel environment or .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if valid credentials exist
const hasValidUrl = typeof supabaseUrl === 'string' && 
  supabaseUrl.length > 0 && 
  supabaseUrl.startsWith('https://') && 
  supabaseUrl.includes('.supabase.co');
  
const hasValidKey = typeof supabaseAnonKey === 'string' && 
  supabaseAnonKey.length > 20 && 
  supabaseAnonKey.startsWith('eyJ');

// Log for debugging
if (typeof window !== 'undefined') {
  console.log('[Supabase] Env check - URL:', hasValidUrl ? 'VALID' : 'MISSING/INVALID');
  console.log('[Supabase] Env check - Key:', hasValidKey ? 'VALID' : 'MISSING/INVALID');
}

// Create client only with valid credentials
let supabase: ReturnType<typeof createClient> | null = null;

if (hasValidUrl && hasValidKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    if (typeof window !== 'undefined') {
      console.log('[Supabase] Client initialized - using live data');
    }
  } catch (e) {
    console.error('[Supabase] Failed to create client:', e);
  }
} else {
  if (typeof window !== 'undefined') {
    console.warn('[Supabase] Invalid credentials - using demo data');
  }
}

export { supabase };
export type SupabaseClient = ReturnType<typeof createClient>;
