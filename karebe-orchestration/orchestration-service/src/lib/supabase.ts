// =============================================================================
// Supabase Client Configuration
// =============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Lazy initialization - client created on first access
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  _supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  });

  return _supabase;
}

// Export a proxy that lazy-loads the client
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    return (client as unknown as Record<string, unknown>)[prop as string];
  },
});

// Test connection on startup
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('orders').select('count').limit(1);
    if (error) {
      logger.error('Supabase connection test failed', { error });
      return false;
    }
    logger.info('Supabase connection established successfully');
    return true;
  } catch (err) {
    logger.error('Supabase connection test error', { error: err });
    return false;
  }
}

export default supabase;