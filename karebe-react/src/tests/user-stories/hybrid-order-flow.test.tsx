import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderReconciliationService } from '../../features/orders/services/order-reconciliation';

/**
 * User Story: Hybrid Order Flow
 * As a customer, I can start an order on the site,
 * complete it via WhatsApp,
 * and the admin can see it reconciled
 */
describe('Hybrid Order Flow - Site + WhatsApp', () => {
  const reconciliationService = new OrderReconciliationService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Customer adds items on site, completes via WhatsApp', async () => {
    // Given: Customer adds items to cart on site
    const cartItems = [
      { id: 'prod-1', name: 'Jameson', quantity: 2, price: 2500 },
    ];

    // When: Customer clicks "Order via WhatsApp"
    const whatsappLink = reconciliationService.generateWhatsAppOrderLink({
      phone: '+254712345678',
      cartItems,
      customerName: 'John Doe',
    });

    // Then: Link contains order context
    expect(whatsappLink).toContain('Jameson');
    expect(whatsappLink).toContain('2500');
  });

  it('Order started on site, confirmed offline, reconciles correctly', async () => {
    // Given: Order exists in site with PENDING status
    const siteOrder = {
      id: 'ord-123',
      status: 'ORDER_SUBMITTED',
      source: 'website',
      items: [{ name: 'Johnnie Walker', qty: 1 }],
    };

    // When: Manager confirms via phone/WhatsApp
    const reconciliation = await reconciliationService.reconcileOrder({
      siteOrderId: 'ord-123',
      offlineConfirmation: {
        confirmedBy: 'manager_phone',
        timestamp: new Date().toISOString(),
        channel: 'whatsapp',
      },
    });

    // Then: Order status reconciles to CONFIRMED
    expect(reconciliation.status).toBe('CONFIRMED_BY_MANAGER');
    expect(reconciliation.reconciliationLogs).toHaveLength(1);
    expect(reconciliation.reconciliationLogs[0].channel).toBe('whatsapp');
  });

  it('Partially digitized order - missing customer info captured', async () => {
    // Given: Order placed via phone lacks customer details
    const phoneOrder = {
      orderId: 'ord-456',
      items: [{ name: 'Hennessy', qty: 2 }],
      source: 'phone_call',
      customerPartial: { phone: '+254712345678' },
    };

    // When: System attempts to enrich with existing customer data
    const enriched = await reconciliationService.enrichOrderData(phoneOrder);

    // Then: System finds matching customer by phone
    expect(enriched.customer.name).toBeDefined();
    expect(enriched.customer.address).toBeDefined();
  });
});

describe('Omnichannel Order Completion', () => {
  it('Customer orders via WhatsApp, pays via M-Pesa, delivery tracked on site', async () => {
    // WhatsApp-initiated order
    const whatsappOrder = {
      source: 'whatsapp',
      customerPhone: '+254712345678',
      items: ['Jameson 1L'],
      mpesaCode: 'ABC123XYZ',
    };

    // Order reconciles into system
    const reconciled = await reconciliationService.createFromExternal({
      ...whatsappOrder,
      needsReconciliation: true,
    });

    expect(reconciled.mpesaCode).toBe('ABC123XYZ');
    expect(reconciled.trackingUrl).toBeDefined();
  });

  it('Manager creates order for walk-in customer', async () => {
    // Walk-in customer pays cash, takes product immediately
    const walkInOrder = {
      source: 'walk_in',
      paymentMethod: 'cash',
      status: 'completed_offline',
      items: [{ name: 'Beer', qty: 6 }],
    };

    const recorded = await reconciliationService.recordOfflineCompletion(walkInOrder);
    
    expect(recorded.inventoryAdjusted).toBe(true);
    expect(recorded.reportsGenerated).toBe(true);
  });
});

describe('Order Reconciliation Edge Cases', () => {
  it('Duplicate order detection - same customer, same items, 5min apart', async () => {
    const order1 = { customerPhone: '+254712345678', items: ['Vodka'], timestamp: Date.now() };
    const order2 = { customerPhone: '+254712345678', items: ['Vodka'], timestamp: Date.now() + 300000 };

    const isDuplicate = reconciliationService.detectDuplicate(order1, order2);
    expect(isDuplicate).toBe(true);
  });

  it('Split payment reconciliation - M-Pesa + Cash', async () => {
    const order = {
      total: 5000,
      payments: [
        { method: 'mpesa', amount: 3000, code: 'MP123' },
        { method: 'cash', amount: 2000 },
      ],
    };

    const reconciled = reconciliationService.reconcilePayment(order);
    expect(reconciled.paidInFull).toBe(true);
    expect(reconciled.paymentBreakdown).toHaveLength(2);
  });

  it('Order modified after submission - customer adds item via phone', async () => {
    const originalOrder = { id: 'ord-789', items: [{ name: 'Wine', qty: 1 }] };
    const modification = { addItems: [{ name: 'Chaser', qty: 2 }] };

    const updated = await reconciliationService.applyModification(originalOrder, modification);
    expect(updated.items).toHaveLength(2);
    expect(updated.modificationLog).toHaveLength(1);
  });
});
