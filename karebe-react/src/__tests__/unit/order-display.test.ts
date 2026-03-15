// =============================================================================
// Order Display Utilities Tests
// =============================================================================

import { 
  formatOrderDisplay,
  getOrderRef,
  parseOrderSequence,
  getOrderUrgency,
  formatOrderAge,
  formatPhoneDisplay,
  getDeliveryMethodDisplay,
  formatItemCount,
  formatPrice,
} from '@/features/orders/utils/order-display';

describe('Order Display Utilities', () => {
  describe('formatOrderDisplay', () => {
    const orderId = '550e8400-e29b-41d4-a716-446655440000';

    it('formats with order reference when available', () => {
      const result = formatOrderDisplay(orderId, 'KRB-042');
      expect(result).toBe('#0042');
    });

    it('falls back to UUID suffix when no reference', () => {
      const result = formatOrderDisplay(orderId, null);
      expect(result).toBe('#6448');
    });

    it('handles undefined gracefully', () => {
      const result = formatOrderDisplay(orderId);
      expect(result).toBe('#6448');
    });

    it('uses custom config when provided', () => {
      const result = formatOrderDisplay(orderId, null, { prefix: 'ORD', defaultBranchCode: 'A' });
      expect(result).toBe('#6448'); // Still uses numeric suffix as fallback
    });
  });

  describe('getOrderRef', () => {
    it('returns reference without hash', () => {
      const result = getOrderRef('550e8400-e29b-41d4-a716-446655440000', 'KRB-042');
      expect(result).toBe('0042');
    });
  });

  describe('parseOrderSequence', () => {
    it('extracts sequence from reference', () => {
      expect(parseOrderSequence('KRB-042')).toBe(42);
      expect(parseOrderSequence('KRB-M-042')).toBe(42);
      expect(parseOrderSequence('KRB-WED-M-042')).toBe(42);
    });

    it('returns null for invalid format', () => {
      expect(parseOrderSequence('invalid')).toBeNull();
    });
  });

  describe('getOrderUrgency', () => {
    it('returns normal for new orders under threshold', () => {
      const recentTime = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 min ago
      const result = getOrderUrgency(recentTime, 'ORDER_SUBMITTED');
      
      expect(result.level).toBe('normal');
      expect(result.ageMinutes).toBe(2);
    });

    it('returns warning for orders approaching threshold', () => {
      const time = new Date(Date.now() - 7 * 60 * 1000).toISOString(); // 7 min ago
      const result = getOrderUrgency(time, 'ORDER_SUBMITTED');
      
      expect(result.level).toBe('warning');
      expect(result.ageMinutes).toBe(7);
    });

    it('returns urgent for old orders', () => {
      const time = new Date(Date.now() - 20 * 60 * 1000).toISOString(); // 20 min ago
      const result = getOrderUrgency(time, 'ORDER_SUBMITTED');
      
      expect(result.level).toBe('urgent');
      expect(result.ageMinutes).toBe(20);
    });

    it('uses different thresholds for different statuses', () => {
      const time = new Date(Date.now() - 35 * 60 * 1000).toISOString(); // 35 min ago
      
      // OUT_FOR_DELIVERY has higher thresholds
      const deliveryResult = getOrderUrgency(time, 'OUT_FOR_DELIVERY');
      expect(deliveryResult.level).toBe('warning');
    });
  });

  describe('formatOrderAge', () => {
    it('formats recent times', () => {
      expect(formatOrderAge(new Date(Date.now() - 30000).toISOString())).toBe('Just now');
      expect(formatOrderAge(new Date(Date.now() - 60000).toISOString())).toBe('1 min ago');
      expect(formatOrderAge(new Date(Date.now() - 180000).toISOString())).toBe('3 min ago');
    });

    it('formats hours', () => {
      expect(formatOrderAge(new Date(Date.now() - 3600000).toISOString())).toBe('1 hour ago');
      expect(formatOrderAge(new Date(Date.now() - 7200000).toISOString())).toBe('2 hours ago');
    });
  });

  describe('formatPhoneDisplay', () => {
    it('formats Kenyan phone numbers', () => {
      expect(formatPhoneDisplay('+254712345678')).toBe('+254 712 345 678');
      expect(formatPhoneDisplay('0712345678')).toBe('+254 712 345 678');
      expect(formatPhoneDisplay('254712345678')).toBe('+254 712 345 678');
    });

    it('handles short numbers', () => {
      expect(formatPhoneDisplay('123')).toBe('123');
    });
  });

  describe('getDeliveryMethodDisplay', () => {
    it('returns delivery when specified', () => {
      const result = getDeliveryMethodDisplay('delivery');
      expect(result.label).toBe('Delivery');
    });

    it('returns pickup when specified', () => {
      const result = getDeliveryMethodDisplay('pickup');
      expect(result.label).toBe('Pickup');
    });

    it('infers from address when not specified', () => {
      expect(getDeliveryMethodDisplay(undefined, true).label).toBe('Delivery');
      expect(getDeliveryMethodDisplay(undefined, false).label).toBe('Pickup');
      expect(getDeliveryMethodDisplay(undefined, undefined).label).toBe('Pickup');
    });
  });

  describe('formatItemCount', () => {
    it('formats correctly', () => {
      expect(formatItemCount(0)).toBe('No items');
      expect(formatItemCount(1)).toBe('1 item');
      expect(formatItemCount(5)).toBe('5 items');
      expect(formatItemCount(undefined)).toBe('No items');
    });
  });

  describe('formatPrice', () => {
    it('formats with default currency', () => {
      expect(formatPrice(1000)).toBe('KES 1,000');
      expect(formatPrice(10000)).toBe('KES 10,000');
    });

    it('formats with custom currency', () => {
      expect(formatPrice(1000, 'USD')).toBe('USD 1,000');
    });
  });
});
