import { supabase } from '@/lib/supabase';
import { demoBranches } from '@/lib/demo-data';
import type { Branch } from '../stores/branch-store';
import type { SupabaseClient } from '@/lib/supabase';

// Check if Supabase is properly configured
// Handle both VITE_ and legacy formats
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
if (supabaseUrl.includes('=')) {
  supabaseUrl = supabaseUrl.split('=')[1] || '';
}
const isSupabaseConfigured = supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co');

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Transform demo branch to Branch format
 */
function transformDemoBranch(demoBranch: typeof demoBranches[0]): Branch {
  return {
    id: demoBranch.id,
    name: demoBranch.name,
    location: demoBranch.address,
    phone: demoBranch.phone,
    lat: demoBranch.coordinates?.lat,
    lng: demoBranch.coordinates?.lng,
    isMain: demoBranch.id === 'branch-wangige',
    operatingHours: {
      open: '08:00',
      close: '22:00',
    },
  };
}

export async function getBranches(): Promise<Branch[]> {
  // Use demo data if Supabase is not configured
  if (!isSupabaseConfigured || !supabase) {
    await delay(300);
    return demoBranches
      .filter(b => b.isActive)
      .sort((a, b) => (a.id === 'branch-wangige' ? -1 : b.id === 'branch-wangige' ? 1 : a.name.localeCompare(b.name)))
      .map(transformDemoBranch);
  }

  const supabaseClient = supabase as SupabaseClient;
  const { data, error } = await supabaseClient
    .from('branches')
    .select('*')
    .order('is_main', { ascending: false })
    .order('name');

  if (error) {
    console.error('Error fetching branches:', error);
    throw new Error(`Failed to fetch branches: ${error.message}`);
  }

  return (data || []).map((branch) => ({
    id: branch.id,
    name: branch.name,
    location: branch.location,
    phone: branch.phone,
    lat: branch.lat,
    lng: branch.lng,
    isMain: branch.is_main,
    operatingHours: branch.operating_hours,
  }));
}

export async function getBranchById(id: string): Promise<Branch | null> {
  // Use demo data if Supabase is not configured
  if (!isSupabaseConfigured || !supabase) {
    await delay(300);
    const demoBranch = demoBranches.find(b => b.id === id);
    return demoBranch ? transformDemoBranch(demoBranch) : null;
  }

  const supabaseClient = supabase as SupabaseClient;
  const { data, error } = await supabaseClient
    .from('branches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch branch: ${error.message}`);
  }

  return data ? {
    id: data.id,
    name: data.name,
    location: data.location,
    phone: data.phone,
    lat: data.lat,
    lng: data.lng,
    isMain: data.is_main,
    operatingHours: data.operating_hours,
  } : null;
}
