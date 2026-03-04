import { supabase } from '@/lib/supabase';

export interface Rider {
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
  email?: string;
  vehicle_type?: string;
  license_plate?: string;
  password: string;
}

export interface RiderUpdateInput {
  full_name?: string;
  phone?: string;
  email?: string;
  vehicle_type?: string;
  license_plate?: string;
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
    // First create the user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email || `${input.phone}@rider.karebe.local`,
      password: input.password,
      options: {
        data: {
          full_name: input.full_name,
          role: 'rider',
        },
      },
    });

    if (authError) {
      throw new Error(`Failed to create rider account: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create rider account: No user returned');
    }

    // Then create the rider profile
    const { data, error } = await supabase
      .from('riders')
      .insert({
        user_id: authData.user.id,
        full_name: input.full_name,
        phone: input.phone,
        email: input.email || null,
        vehicle_type: input.vehicle_type || null,
        license_plate: input.license_plate || null,
        is_active: true,
        total_deliveries: 0,
        rating: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Rollback: delete the auth user if rider creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create rider profile: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create rider profile: No data returned');
    }

    return data;
  }

  static async updateRider(id: string, updates: RiderUpdateInput): Promise<Rider> {
    const { data, error } = await supabase
      .from('riders')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update rider: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update rider: No data returned');
    }

    return data;
  }

  static async deleteRider(id: string): Promise<void> {
    const rider = await this.getRiderById(id);
    if (!rider) {
      throw new Error('Rider not found');
    }

    // Delete rider profile first
    const { error } = await supabase
      .from('riders')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete rider: ${error.message}`);
    }

    // Then delete the auth user
    await supabase.auth.admin.deleteUser(rider.user_id);
  }

  static async toggleRiderStatus(id: string): Promise<Rider> {
    const rider = await this.getRiderById(id);
    if (!rider) {
      throw new Error('Rider not found');
    }

    return this.updateRider(id, { is_active: !rider.is_active });
  }

  static async updateRiderLocation(
    id: string,
    latitude: number,
    longitude: number
  ): Promise<Rider> {
    const { data, error } = await supabase
      .from('riders')
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_update: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update rider location: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update rider location: No data returned');
    }

    return data;
  }

  static async getAvailableRiders(): Promise<Rider[]> {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('is_active', true)
      .order('total_deliveries', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch available riders: ${error.message}`);
    }

    return data || [];
  }

  static async getRiderStats(id: string): Promise<{
    totalDeliveries: number;
    rating: number;
    averageDeliveryTime: number;
    completionRate: number;
  }> {
    const { data: deliveries, error } = await supabase
      .from('deliveries')
      .select('status, created_at, completed_at')
      .eq('rider_id', id);

    if (error) {
      throw new Error(`Failed to fetch rider stats: ${error.message}`);
    }

    const total = deliveries?.length || 0;
    const completed = deliveries?.filter(d => d.status === 'completed').length || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Calculate average delivery time
    const completedDeliveries = deliveries?.filter(d => d.status === 'completed' && d.completed_at) || [];
    const avgTime = completedDeliveries.length > 0
      ? completedDeliveries.reduce((sum, d) => {
          const start = new Date(d.created_at).getTime();
          const end = new Date(d.completed_at!).getTime();
          return sum + (end - start);
        }, 0) / completedDeliveries.length / 1000 / 60 // in minutes
      : 0;

    const rider = await this.getRiderById(id);

    return {
      totalDeliveries: total,
      rating: rider?.rating || 0,
      averageDeliveryTime: Math.round(avgTime),
      completionRate: Math.round(completionRate),
    };
  }
}