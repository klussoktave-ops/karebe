import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate Supabase credentials and provide graceful fallback
const isValidUrl = supabaseUrl && !supabaseUrl.includes('your-project');
const isValidKey = supabaseAnonKey && !supabaseAnonKey.includes('your-anon-key');

if (!isValidUrl || !isValidKey) {
  console.warn(
    '[Supabase] Missing or invalid Supabase credentials. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables. ' +
    'Auth and data features will not work until configured.'
  );
}

// Use placeholder values if missing to prevent crashes during development
const safeUrl = isValidUrl ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = isValidKey ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type SupabaseClient = typeof supabase;
