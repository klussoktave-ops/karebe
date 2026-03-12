/**
 * WhatsApp Parser Tests
 * Tests the WhatsApp message parser functionality
 */

import { describe, it, expect } from 'vitest';
import { 
  parseWhatsAppOrderMessage, 
  formatParsedItemsForConfirmation,
  generateOrderConfirmationMessage,
  extractCustomerInfo,
  type ParsedOrderItem 
} from '@/features/orders/services/whatsapp-message-parser';

describe('WhatsApp Message Parser', () => {
  describe('parseWhatsAppOrderMessage', () => {
    it('should parse basic order message', () => {
      const message = `Hello! I would like to order:
- Red Wine x2
- Tusker Lager x6

Total: KES 4200`;

      const items = parseWhatsAppOrderMessage(message);
      expect(items.length).toBeGreaterThan(0);
    });

    it('should parse items with prices', () => {
      const message = `- Red Wine 750ml x2 @ KES 1500
- Vodka 1L x1 @ KES 2500`;

      const items = parseWhatsAppOrderMessage(message);
      expect(items.length).toBe(2);
      expect(items[0].name).toContain('Red Wine');
    });

    it('should handle KES price format', () => {
      const message = `- Wine x1 KES 1500`;

      const items = parseWhatsAppOrderMessage(message);
      expect(items[0].unitPrice).toBe(1500);
    });

    it('should handle multiple quantity formats', () => {
      const testCases = [
        '- Beer x6',
        '- Wine 2 bottles',
        '- Vodka x3',
      ];
      
      testCases.forEach(msg => {
        const items = parseWhatsAppOrderMessage(msg);
        expect(items.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should extract quantities correctly', () => {
      const message = '- Product x5';
      const items = parseWhatsAppOrderMessage(message);
      
      if (items.length > 0) {
        expect(items[0].quantity).toBe(5);
      }
    });
  });

  describe('extractCustomerInfo', () => {
    it('should extract phone number', () => {
      const message = 'Hi, my phone is 254712345678';
      const info = extractCustomerInfo(message);
      expect(info.phone).toContain('254');
    });

    it('should extract phone with + prefix', () => {
      const message = 'Phone: +254712345678';
      const info = extractCustomerInfo(message);
      expect(info.phone).toBeDefined();
    });

    it('should extract name', () => {
      const message = 'Name: John Doe';
      const info = extractCustomerInfo(message);
      expect(info.name).toBe('John Doe');
    });

    it('should extract address', () => {
      const message = 'Address: 123 Main Street, Nairobi';
      const info = extractCustomerInfo(message);
      expect(info.address).toContain('Main');
    });
  });

  describe('formatParsedItemsForConfirmation', () => {
    it('should format items for confirmation', () => {
      const items: ParsedItem[] = [
        { name: 'Red Wine', quantity: 2, unitPrice: 1500, matched: false },
        { name: 'Tusker', quantity: 6, unitPrice: 200, matched: false },
      ];

      const message = formatParsedItemsForConfirmation(items);
      expect(message).toContain('Order Received');
      expect(message).toContain('Red Wine');
      expect(message).toContain('Total');
    });
  });

  describe('generateOrderConfirmationMessage', () => {
    it('should generate confirmation with customer name', () => {
      const items: ParsedItem[] = [
        { name: 'Wine', quantity: 1, unitPrice: 1500, matched: false },
      ];

      const message = generateOrderConfirmationMessage(items, 'John');
      expect(message).toContain('John');
      expect(message).toContain('Order Confirmed');
    });

    it('should include delivery address', () => {
      const items: ParsedItem[] = [
        { name: 'Beer', quantity: 2, unitPrice: 400, matched: false },
      ];

      const message = generateOrderConfirmationMessage(items, undefined, '123 Main St');
      expect(message).toContain('123 Main St');
    });
  });
});
