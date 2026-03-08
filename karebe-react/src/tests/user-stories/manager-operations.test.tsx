import { describe, it, expect } from 'vitest';
import { ManagerOperationService } from '../../features/admin/services/manager-operations';

/**
 * User Story: Manager Operations
 * As a manager, I can handle orders from multiple channels
 * and reconcile them without forcing digitization
 */
describe('Manager Order Operations', () => {
  const managerService = new ManagerOperationService();

  describe('Cross-Channel Order Management', () => {
    it('Manager sees all orders from all channels in unified view', async () => {
      const dashboard = await managerService.getUnifiedDashboard();
      
      expect(dashboard.orders).toContainEqual(
        expect.objectContaining({ source: 'website' })
      );
      expect(dashboard.orders).toContainEqual(
        expect.objectContaining({ source: 'whatsapp' })
      );
      expect(dashboard.orders).toContainEqual(
        expect.objectContaining({ source: 'phone_call' })
      );
      expect(dashboard.orders).toContainEqual(
        expect.objectContaining({ source: 'walk_in' })
      );
    });

    it('Manager can create order for walk-in customer without forcing app usage', async () => {
      const order = await managerService.createOfflineOrder({
        source: 'walk_in',
        customerName: 'Walk-in Customer',
        items: [{ name: 'Beer', quantity: 6 }],
        paymentMethod: 'cash',
        amount: 1800,
      });

      expect(order.id).toBeDefined();
      expect(order.source).toBe('walk_in');
      expect(order.requiresDigitization).toBe(false);
      expect(order.inventoryAdjusted).toBe(true);
    });

    it('Manager confirms order received via WhatsApp without customer using site', async () => {
      const whatsappOrder = await managerService.processExternalOrder({
        channel: 'whatsapp',
        customerPhone: '+254712345678',
        message: 'I want 2 bottles of Jameson',
        timestamp: new Date().toISOString(),
      });

      // Manager creates structured order from unstructured message
      const structured = await managerService.structureOrder(whatsappOrder.id, {
        items: [{ name: 'Jameson', quantity: 2, price: 2500 }],
        customerName: 'WhatsApp Customer',
        deliveryAddress: 'To be confirmed',
      });

      expect(structured.items).toHaveLength(1);
      expect(structured.total).toBe(5000);
      expect(structured.needsCustomerConfirmation).toBe(true);
    });

    it('Manager can mark phone order as complete without full digitization', async () => {
      const phoneOrder = await managerService.createOfflineOrder({
        source: 'phone_call',
        customerPhone: '+254798765432',
        items: [{ name: 'Vodka', quantity: 1 }],
        paymentMethod: 'mpesa',
        mpesaCode: 'XYZ123',
        status: 'completed',
      });

      expect(phoneOrder.trackingUrl).toBeNull(); // No tracking needed
      expect(phoneOrder.reportsGenerated).toBe(true);
      expect(phoneOrder.customerNotificationSent).toBe(true);
    });
  });

  describe('Partial Digitization Scenarios', () => {
    it('Order started on site, payment done via M-Pesa manually, reconciled by manager', async () => {
      // Customer started on site but paid offline
      const partialOrder = {
        id: 'PARTIAL-001',
        startedOn: 'website',
        status: 'pending_payment',
        items: [{ name: 'Wine', quantity: 2 }],
      };

      const reconciliation = await managerService.reconcilePartialOrder({
        orderId: partialOrder.id,
        paymentChannel: 'mpesa_manual',
        mpesaCode: 'MAN123',
        verifiedBy: 'manager_john',
      });

      expect(reconciliation.status).toBe('payment_received');
      expect(reconciliation.digitizationLevel).toBe('partial');
      expect(reconciliation.manualIntervention).toBe(true);
    });

    it('Customer calls to modify site order', async () => {
      const modification = await managerService.modifyOrderViaPhone({
        originalOrderId: 'ORD-789',
        customerPhone: '+254712345678',
        modification: {
          addItems: [{ name: 'Soda', quantity: 4 }],
          changeDeliveryTime: '30 minutes later',
        },
        verifiedBy: 'manager_jane',
      });

      expect(modification.approved).toBe(true);
      expect(modification.newTotal).toBeGreaterThan(modification.originalTotal);
      expect(modification.customerConfirmationSent).toBe(true);
    });

    it('Rider delivery confirmed offline via phone call', async () => {
      const deliveryConfirmation = await managerService.confirmDeliveryOffline({
        orderId: 'ORD-456',
        riderPhone: '+254723456789',
        confirmationMethod: 'phone_call',
        notes: 'Delivered to reception',
        timestamp: new Date().toISOString(),
      });

      expect(deliveryConfirmation.status).toBe('delivered');
      expect(deliveryConfirmation.systemUpdated).toBe(true);
      expect(deliveryConfirmation.customerNotified).toBe(true);
    });
  });

  describe('Reconciliation Reports', () => {
    it('Daily reconciliation shows digitized vs non-digitized orders', async () => {
      const report = await managerService.getDailyReconciliation('2024-01-15');

      expect(report.totalOrders).toBeGreaterThan(0);
      expect(report.digitizedOrders).toBeDefined();
      expect(report.partiallyDigitized).toBeDefined();
      expect(report.offlineOnly).toBeDefined();
      expect(report.reconciliationAccuracy).toBeGreaterThan(0.95);
    });

    it('Identifies orders needing digitization follow-up', async () => {
      const needsFollowUp = await managerService.getOrdersNeedingFollowUp();

      expect(needsFollowUp).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            reason: 'missing_customer_details',
            suggestedAction: 'send_whatsapp_link',
          }),
        ])
      );
    });

    it('Sync status between offline and online records', async () => {
      const syncStatus = await managerService.checkSyncStatus({
        date: '2024-01-15',
      });

      expect(syncStatus.totalOffline).toBeGreaterThanOrEqual(0);
      expect(syncStatus.totalOnline).toBeGreaterThanOrEqual(0);
      expect(syncStatus.mismatches).toBeDefined();
      expect(syncStatus.recommendations).toBeDefined();
    });
  });

  describe('Customer Communication', () => {
    it('Send order confirmation to customer via preferred channel', async () => {
      const notification = await managerService.notifyCustomer({
        orderId: 'ORD-111',
        channel: 'whatsapp',
        message: 'Your order #111 is confirmed and out for delivery',
      });

      expect(notification.sent).toBe(true);
      expect(notification.delivered).toBe(true);
    });

    it('Generate tracking link for partially digitized order', async () => {
      const tracking = await managerService.generateTrackingForOrder({
        orderId: 'ORD-222',
        customerPhone: '+254712345678',
      });

      expect(tracking.url).toBeDefined();
      expect(tracking.smsSent).toBe(true);
      expect(tracking.noAppRequired).toBe(true);
    });
  });
});
