import { createClient } from '@supabase/supabase-js';

// Get env vars - these come from Vercel environment or .env file
// Handle both VITE_SUPABASE_URL and legacy SUPABASE_URL formats
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

// Strip any KEY= prefix if present (e.g., from .env file without VITE_)
if (supabaseUrl.includes('=')) {
  supabaseUrl = supabaseUrl.split('=')[1] || '';
}
if (supabaseAnonKey.includes('=')) {
  supabaseAnonKey = supabaseAnonKey.split('=')[1] || '';
}

// Debug: Log raw values
console.log('[Supabase] Raw URL value:', JSON.stringify(supabaseUrl));
console.log('[Supabase] Raw Key value:', supabaseAnonKey ? '[PRESENT]' : '[MISSING]');

// Check if valid credentials exist
const hasValidUrl = typeof supabaseUrl === 'string' && 
  supabaseUrl.length > 0 && 
  supabaseUrl.startsWith('https://') && 
  supabaseUrl.includes('.supabase.co');
  
const hasValidKey = typeof supabaseAnonKey === 'string' && 
  supabaseAnonKey.length > 20 && 
  supabaseAnonKey.startsWith('eyJ');

// Log for debugging
console.log('[Supabase] URL check - length:', supabaseUrl?.length, '| startsWith https:', supabaseUrl?.startsWith('https://'), '| includes supabase.co:', supabaseUrl?.includes('.supabase.co'));
console.log('[Supabase] Final - URL Valid:', hasValidUrl, '| Key Valid:', hasValidKey);

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
    console.log('[Supabase] Client initialized - using live data');
  } catch (e) {
    console.error('[Supabase] Failed to create client:', e);
  }
} else {
  console.warn('[Supabase] Invalid credentials - using demo data');
}

export { supabase };
export type SupabaseClient = ReturnType<typeof createClient>;
