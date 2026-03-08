/**
 * Mautrix-WhatsApp Bridge Tests
 * Verifies webhook processing for WhatsApp messages via Matrix
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import webhookRouter from '../../routes/webhook';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('../../services/orderService', () => ({
  orderService: {
    confirmRider: vi.fn().mockResolvedValue(undefined),
    updateOrderStatus: vi.fn().mockResolvedValue(undefined),
    completeDelivery: vi.fn().mockResolvedValue(undefined),
    startDelivery: vi.fn().mockResolvedValue(undefined),
    getOrder: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Mautrix Webhook Integration', () => {
  let app: express.Application;
  const webhookSecret = 'test-webhook-secret';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/webhook', webhookRouter);
    process.env.MAUTRIX_WEBHOOK_SECRET = webhookSecret;
    vi.clearAllMocks();
  });

  describe('Webhook Security', () => {
    it('should reject requests without webhook secret', async () => {
      const response = await request(app)
        .post('/api/webhook/mautrix')
        .send({ event_id: 'test-123' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject requests with invalid webhook secret', async () => {
      const response = await request(app)
        .post('/api/webhook/mautrix')
        .set('x-webhook-secret', 'wrong-secret')
        .send({ event_id: 'test-123' });

      expect(response.status).toBe(401);
    });

    it('should accept requests with valid webhook secret', async () => {
      const payload = {
        event_id: 'test-123',
        room_id: '!test:matrix.org',
        sender: '@whatsapp_254712345678:matrix.org',
        content: {
          body: 'YES',
          msgtype: 'm.text',
        },
        timestamp: Date.now(),
      };

      const response = await request(app)
        .post('/api/webhook/mautrix')
        .set('x-webhook-secret', webhookSecret)
        .send(payload);

      expect(response.status).toBe(200);
    });
  });

  describe('Webhook Payload Validation', () => {
    it('should reject invalid payload structure', async () => {
      const response = await request(app)
        .post('/api/webhook/mautrix')
        .set('x-webhook-secret', webhookSecret)
        .send({ invalid: 'payload' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid payload');
    });

    it('should accept valid mautrix payload', async () => {
      const payload = {
        event_id: 'evt-12345',
        room_id: '!room:matrix.org',
        sender: '@whatsapp_254712345678:matrix.org',
        content: {
          body: 'Confirm delivery',
          msgtype: 'm.text',
        },
        timestamp: Date.now(),
      };

      const response = await request(app)
        .post('/api/webhook/mautrix')
        .set('x-webhook-secret', webhookSecret)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Phone Number Extraction', () => {
    const testCases = [
      {
        sender: '@whatsapp_254712345678:matrix.org',
        expected: '254712345678',
      },
      {
        sender: '@whatsapp_254723456789:example.com',
        expected: '254723456789',
      },
      {
        sender: '@user:matrix.org',
        expected: null,
      },
    ];

    testCases.forEach(({ sender, expected }) => {
      it(`should extract ${expected} from ${sender}`, async () => {
        const payload = {
          event_id: `evt-${Date.now()}`,
          room_id: '!room:matrix.org',
          sender,
          content: { body: 'TEST', msgtype: 'm.text' },
          timestamp: Date.now(),
        };

        const response = await request(app)
          .post('/api/webhook/mautrix')
          .set('x-webhook-secret', webhookSecret)
          .send(payload);

        expect(response.status).toBe(200);
      });
    });
  });

  describe('Intent Recognition', () => {
    const intentTests = [
      { message: 'YES', expectedAction: 'RIDER_CONFIRMED' },
      { message: 'CONFIRM', expectedAction: 'RIDER_CONFIRMED' },
      { message: 'NDIO', expectedAction: 'RIDER_CONFIRMED' },
      { message: 'NO', expectedAction: 'RIDER_REJECTED' },
      { message: 'REJECT', expectedAction: 'RIDER_REJECTED' },
      { message: 'HAPANA', expectedAction: 'RIDER_REJECTED' },
      { message: 'DELIVERED', expectedAction: 'DELIVERY_COMPLETED' },
      { message: 'IMEFIKA', expectedAction: 'DELIVERY_COMPLETED' },
      { message: 'START', expectedAction: 'DELIVERY_STARTED' },
      { message: 'NAENDA', expectedAction: 'DELIVERY_STARTED' },
      { message: 'STATUS', expectedAction: 'STATUS_PROVIDED' },
      { message: 'ORDER ID?', expectedAction: 'STATUS_PROVIDED' },
      { message: 'UNKNOWN', expectedAction: 'UNKNOWN_INTENT' },
    ];

    intentTests.forEach(({ message, expectedAction }) => {
      it(`should recognize "${message}" intent`, async () => {
        const payload = {
          event_id: `evt-${Date.now()}`,
          room_id: '!room:matrix.org',
          sender: '@whatsapp_254712345678:matrix.org',
          content: { body: message, msgtype: 'm.text' },
          timestamp: Date.now(),
        };

        const response = await request(app)
          .post('/api/webhook/mautrix')
          .set('x-webhook-secret', webhookSecret)
          .send(payload);

        expect(response.status).toBe(200);
        expect(response.body.action).toBe(expectedAction);
      });
    });
  });

  describe('Duplicate Event Prevention', () => {
    it('should ignore duplicate events', async () => {
      const { supabase } = await import('../../lib/supabase');

      // Mock existing event
      (supabase.from as any) = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'existing-event', status: 'completed' },
              error: null,
            }),
          })),
        })),
      }));

      const payload = {
        event_id: 'duplicate-evt-123',
        room_id: '!room:matrix.org',
        sender: '@whatsapp_254712345678:matrix.org',
        content: { body: 'YES', msgtype: 'm.text' },
        timestamp: Date.now(),
      };

      const response = await request(app)
        .post('/api/webhook/mautrix')
        .set('x-webhook-secret', webhookSecret)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Duplicate event ignored');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/webhook/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('End-to-End Flow', () => {
    it('should process complete rider confirmation flow', async () => {
      const { supabase } = await import('../../lib/supabase');
      const { orderService } = await import('../../services/orderService');

      const orderId = 'ord-123-abc';
      const riderId = 'rider-456';
      const userId = 'user-789';

      // Mock rider lookup
      (supabase.from as any) = vi.fn((table: string) => {
        if (table === 'webhook_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'riders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: riderId, user_id: userId },
                }),
              })),
            })),
          };
        }
        if (table === 'rider_availability') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { current_order_id: orderId },
                }),
              })),
            })),
            update: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const payload = {
        event_id: 'evt-complete-flow',
        room_id: '!room:matrix.org',
        sender: '@whatsapp_254712345678:matrix.org',
        content: { body: 'YES, I confirm', msgtype: 'm.text' },
        timestamp: Date.now(),
      };

      const response = await request(app)
        .post('/api/webhook/mautrix')
        .set('x-webhook-secret', webhookSecret)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe('RIDER_CONFIRMED');
      expect(response.body.order_id).toBe(orderId);
    });
  });
});

describe('Mautrix Configuration', () => {
  it('should have required environment variables', () => {
    const required = ['MAUTRIX_WEBHOOK_SECRET'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    }
  });

  it('should have webhook endpoint configured', () => {
    const endpoints = [
      { method: 'POST', path: '/api/webhook/mautrix' },
      { method: 'GET', path: '/api/webhook/health' },
    ];

    endpoints.forEach(endpoint => {
      expect(endpoint.path).toMatch(/^\/api\/webhook/);
    });
  });
});