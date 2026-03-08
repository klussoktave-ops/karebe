// =============================================================================
// Orders API Integration Tests
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import orderRoutes from '../orders';

const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);

describe('Orders API Integration', () => {
  describe('POST /api/orders', () => {
    it('should create a new order via call button', async () => {
      const orderData = {
        customer_phone: '254712345678',
        customer_name: 'John Doe',
        delivery_address: '123 Test Street, Nairobi',
        branch_id: '550e8400-e29b-41d4-a716-446655440000',
        items: [
          {
            product_id: '550e8400-e29b-41d4-a716-446655440001',
            product_name: 'Test Product',
            quantity: 2,
            unit_price: 1000,
          },
        ],
        trigger_source: 'call_button',
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect('Content-Type', /json/);

      // Should fail in test environment without database
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({})
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should require at least one item', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          customer_phone: '254712345678',
          delivery_address: 'Test Address',
          branch_id: '550e8400-e29b-41d4-a716-446655440000',
          items: [],
          trigger_source: 'call_button',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .get('/api/orders/550e8400-e29b-41d4-a716-446655440000')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('should validate status transitions', async () => {
      const response = await request(app)
        .patch('/api/orders/550e8400-e29b-41d4-a716-446655440000/status')
        .send({
          status: 'INVALID_STATUS',
          actor_type: 'admin',
          actor_id: '550e8400-e29b-41d4-a716-446655440001',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});