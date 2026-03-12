import { supabase } from '@/lib/supabase';

export interface Rider {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  pin: string | null;
  whatsapp_number: string | null;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
}

// For backward compatibility
export interface RiderLegacy {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  vehicle_type: string | null;
  license_plate: string | null;
  is_active: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  total_deliveries: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface RiderCreateInput {
  full_name: string;
  phone: string;
  pin?: string;
  whatsapp_number?: string;
  branch_id?: string;
}

export interface RiderUpdateInput {
  full_name?: string;
  phone?: string;
  pin?: string;
  whatsapp_number?: string;
  branch_id?: string;
  is_active?: boolean;
}

export interface RiderFilters {
  isActive?: boolean;
  search?: string;
}

export class RiderManager {
  static async getRiders(filters?: RiderFilters): Promise<Rider[]> {
    let query = supabase.from('riders').select('*');

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch riders: ${error.message}`);
    }

    return data || [];
  }

  static async getRiderById(id: string): Promise<Rider | null> {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch rider: ${error.message}`);
    }

    return data;
  }

  static async getRiderByUserId(userId: string): Promise<Rider | null> {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch rider: ${error.message}`);
    }

    return data;
  }

  static async createRider(input: RiderCreateInput): Promise<Rider> {
    // Generate a random 4-digit PIN if not provided
    const pin = input.pin || Math.floor(1000 + Math.random() * 9000).toString();
    
    const { data, error } = await supabase
      .from('riders')
      .insert({
        id: crypto.randomUUID(),
        user_id: null,
        full_name: input.full_name,
        phone: input.phone,
        pin: pin,
        whatsapp_number: input.whatsapp_number || input.phone,
        branch_id: input.branch_id || null,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create rider: ${error.message}`);
    }

    return data;
  }

  static async updateRider(id: string, updates: RiderUpdateInput): Promise<Rider> {
    const { data, error } = await supabase
      .from('riders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update rider: ${error.message}`);
    }

    return data;
  }

  static async deleteRider(id: string): Promise<void> {
    const { error } = await supabase
      .from('riders')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete rider: ${error.message}`);
    }
  }

  static async toggleRiderStatus(id: string): Promise<Rider> {
    const rider = await this.getRiderById(id);
    if (!rider) {
      throw new Error('Rider not found');
    }

    return this.updateRider(id, { is_active: !rider.is_active });
  }

  static async getRidersByBranch(branchId: string): Promise<Rider[]> {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch riders by branch: ${error.message}`);
    }

    return data || [];
  }
}