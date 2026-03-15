// =============================================================================
// Order Reference Service Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => ({ 
        select: vi.fn(() => ({ 
          single: vi.fn(() => ({ data: null, error: null })) 
        })),
      })),
      upsert: vi.fn(() => ({ error: null })),
    })),
  },
}));

vi.mock('../lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocking
import { 
  generateOrderReference, 
  formatOrderDisplay, 
  parseOrderReference, 
  isValidOrderReference,
  createFallbackReference,
  resolveBranchCode,
  getOrderReferenceConfig,
} from '../orderReference';

describe('Order Reference Generation', () => {
  describe('generateOrderReference', () => {
    it('generates reference with default config', async () => {
      const result = await generateOrderReference();
      
      expect(result).toHaveProperty('reference');
      expect(result).toHaveProperty('branchCode');
      expect(result).toHaveProperty('dailySequence');
      expect(result.reference).toMatch(/^KRB-\d{3}$/);
    });

    it('generates reference with branch code when branchId provided', async () => {
      const result = await generateOrderReference('some-branch-id');
      
      expect(result).toHaveProperty('branchCode');
      // Branch code should be derived from branch name or default
      expect(result.branchCode).toBeDefined();
    });

    it('generates reference with explicit sequence', async () => {
      const result = await generateOrderReference(undefined, 42);
      
      expect(result.dailySequence).toBe(42);
      expect(result.reference).toContain('042');
    });

    it('generates reference with day format when requested', async () => {
      const result = await generateOrderReference(undefined, 42, { useDayFormat: true });
      
      // Should contain day abbreviation
      expect(result.reference).toMatch(/KRB-[A-Z]{3}-\d{3}/);
    });
  });

  describe('formatOrderDisplay', () => {
    it('formats with order reference when available', () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      const orderRef = 'KRB-042';
      
      const display = formatOrderDisplay(orderId, orderRef);
      
      expect(display).toBe('#KRB-042');
    });

    it('falls back to UUID suffix when no reference', () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      
      const display = formatOrderDisplay(orderId, null);
      
      expect(display).toBe('#440000');
    });

    it('handles undefined reference gracefully', () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      
      const display = formatOrderDisplay(orderId);
      
      expect(display).toBe('#440000');
    });

    it('handles empty string reference', () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      
      const display = formatOrderDisplay(orderId, '');
      
      expect(display).toBe('#440000');
    });
  });

  describe('parseOrderReference', () => {
    it('parses standard format', () => {
      const parsed = parseOrderReference('KRB-042');
      
      expect(parsed).not.toBeNull();
      expect(parsed?.prefix).toBe('KRB');
      expect(parsed?.sequence).toBe(42);
    });

    it('parses format with branch code', () => {
      const parsed = parseOrderReference('KRB-M-042');
      
      expect(parsed).not.toBeNull();
      expect(parsed?.prefix).toBe('KRB');
      expect(parsed?.branchCode).toBe('M');
      expect(parsed?.sequence).toBe(42);
    });

    it('parses day format', () => {
      const parsed = parseOrderReference('KRB-WED-042');
      
      expect(parsed).not.toBeNull();
      expect(parsed?.prefix).toBe('KRB');
      expect(parsed?.dayOfWeek).toBe('WED');
      expect(parsed?.sequence).toBe(42);
    });

    it('parses full day format with branch', () => {
      const parsed = parseOrderReference('KRB-WED-M-042');
      
      expect(parsed).not.toBeNull();
      expect(parsed?.prefix).toBe('KRB');
      expect(parsed?.dayOfWeek).toBe('WED');
      expect(parsed?.branchCode).toBe('M');
      expect(parsed?.sequence).toBe(42);
    });

    it('parses simple numeric format', () => {
      const parsed = parseOrderReference('042');
      
      expect(parsed).not.toBeNull();
      expect(parsed?.sequence).toBe(42);
    });

    it('returns null for invalid format', () => {
      const parsed = parseOrderReference('invalid');
      
      expect(parsed).toBeNull();
    });

    it('handles case insensitivity', () => {
      const parsed = parseOrderReference('krb-042');
      
      expect(parsed).not.toBeNull();
      expect(parsed?.sequence).toBe(42);
    });
  });

  describe('isValidOrderReference', () => {
    it('validates correct formats', () => {
      expect(isValidOrderReference('KRB-042')).toBe(true);
      expect(isValidOrderReference('KRB-M-042')).toBe(true);
      expect(isValidOrderReference('042')).toBe(true);
      expect(isValidOrderReference('krb-042')).toBe(true);
    });

    it('rejects invalid formats', () => {
      expect(isValidOrderReference('invalid')).toBe(false);
      expect(isValidOrderReference('')).toBe(false);
      expect(isValidOrderReference('KRB')).toBe(false);
    });
  });

  describe('createFallbackReference', () => {
    it('creates reference from UUID suffix', () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      
      const ref = createFallbackReference(orderId);
      
      expect(ref).toBe('KRB-440000');
    });
  });
});

describe('Backward Compatibility', () => {
  it('handles orders without order_reference', () => {
    // Existing orders won't have order_reference set
    const orderId = '550e8400-e29b-41d4-a716-446655440000';
    
    const display = formatOrderDisplay(orderId, undefined);
    
    // Should fall back to UUID suffix
    expect(display).toMatch(/^#.{6}$/);
  });

  it('handles null order_reference in database', () => {
    const orderId = '550e8400-e29b-41d4-a716-446655440000';
    
    // Simulating database null value
    const display = formatOrderDisplay(orderId, null);
    
    expect(display).toBe('#440000');
  });
});
