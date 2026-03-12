import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiderManager, type RiderCreateInput } from '../rider-manager';
import { supabase } from '@/lib/supabase';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
    auth: {
      signUp: vi.fn(),
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  },
}));

describe('RiderManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRiders', () => {
    it('should fetch all riders without filters', async () => {
      const mockRiders = [
        {
          id: 'rider-1',
          full_name: 'John Doe',
          phone: '+254712345678',
          is_active: true,
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockRiders, error: null }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const riders = await RiderManager.getRiders();

      expect(mockFrom).toHaveBeenCalledWith('riders');
      expect(riders).toEqual(mockRiders);
    });

    it('should filter riders by active status', async () => {
      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      (supabase.from as any) = mockFrom;

      await RiderManager.getRiders({ isActive: true });

      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });

    it('should search riders by name or phone', async () => {
      const mockOr = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: mockOr,
        }),
      });

      (supabase.from as any) = mockFrom;

      await RiderManager.getRiders({ search: 'john' });

      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('full_name.ilike.%john%')
      );
    });
  });

  describe('createRider', () => {
    it('should create rider with auth account successfully', async () => {
      const input: RiderCreateInput = {
        full_name: 'Jane Smith',
        phone: '+254723456789',
        email: 'jane@example.com',
        vehicle_type: 'Motorcycle',
        license_plate: 'KBC 123A',
        password: 'SecurePass123!',
      };

      const mockUser = { id: 'auth-user-123' };

      (supabase.auth.signUp as any) = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRider = {
        id: 'rider-123',
        user_id: mockUser.id,
        full_name: input.full_name,
        phone: input.phone,
        is_active: true,
        total_deliveries: 0,
        rating: 0,
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockRider,
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await RiderManager.createRider(input);

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: input.email,
          password: input.password,
          options: expect.objectContaining({
            data: {
              full_name: input.full_name,
              role: 'rider',
            },
          }),
        })
      );
      expect(result.full_name).toBe(input.full_name);
    });

    it('should create rider without email (using phone as email)', async () => {
      const input: RiderCreateInput = {
        full_name: 'John Doe',
        phone: '+254734567890',
        password: 'password123',
      };

      (supabase.auth.signUp as any) = vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'rider-1' },
              error: null,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      await RiderManager.createRider(input);

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: `${input.phone}@rider.karebe.local`,
        })
      );
    });

    it('should rollback auth user if profile creation fails', async () => {
      const input: RiderCreateInput = {
        full_name: 'Test Rider',
        phone: '+254700000000',
        password: 'password',
      };

      const mockUser = { id: 'user-to-delete' };

      (supabase.auth.signUp as any) = vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile creation failed' },
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      await expect(RiderManager.createRider(input)).rejects.toThrow(
        'Profile creation failed'
      );

      expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('toggleRiderStatus', () => {
    it('should toggle rider active status', async () => {
      const riderId = 'rider-1';
      const mockRider = {
        id: riderId,
        full_name: 'Test Rider',
        is_active: true,
      };

      const mockSingleGet = vi.fn().mockResolvedValue({
        data: mockRider,
        error: null,
      });

      const mockSingleUpdate = vi.fn().mockResolvedValue({
        data: { ...mockRider, is_active: false },
        error: null,
      });

      let callCount = 0;
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => {
              callCount++;
              return callCount === 1 ? mockSingleGet() : mockSingleUpdate();
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockSingleUpdate,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await RiderManager.toggleRiderStatus(riderId);

      expect(result.is_active).toBe(false);
    });
  });

  describe('updateRiderLocation', () => {
    it('should update rider location coordinates', async () => {
      const riderId = 'rider-1';
      const latitude = -1.2921;
      const longitude = 36.8219;

      const mockRider = {
        id: riderId,
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_update: expect.any(String),
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockRider,
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      });

      (supabase.from as any) = mockFrom;

      const result = await RiderManager.updateRiderLocation(
        riderId,
        latitude,
        longitude
      );

      expect(result.current_latitude).toBe(latitude);
      expect(result.current_longitude).toBe(longitude);
    });
  });

  describe('getAvailableRiders', () => {
    it('should return only active riders ordered by delivery count', async () => {
      const mockRiders = [
        { id: 'rider-1', is_active: true, total_deliveries: 100 },
        { id: 'rider-2', is_active: true, total_deliveries: 50 },
      ];

      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockRiders,
          error: null,
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      (supabase.from as any) = mockFrom;

      const riders = await RiderManager.getAvailableRiders();

      expect(mockEq).toHaveBeenCalledWith('is_active', true);
      expect(riders).toEqual(mockRiders);
    });
  });

  describe('deleteRider', () => {
    it('should delete rider profile and auth user', async () => {
      const riderId = 'rider-1';
      const mockRider = {
        id: riderId,
        user_id: 'auth-user-123',
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockRider,
        error: null,
      });

      const mockEq = vi.fn().mockResolvedValue({ error: null });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      (supabase.from as any) = mockFrom;

      await RiderManager.deleteRider(riderId);

      expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith(
        mockRider.user_id
      );
    });
  });
});