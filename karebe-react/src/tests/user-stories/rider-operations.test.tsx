import { describe, it, expect } from 'vitest';
import { RiderService } from '../../features/delivery/services/rider-service';

/**
 * User Story: Rider Operations
 * As a rider, I can accept deliveries, confirm via phone,
 * and complete deliveries even without full app usage
 */
describe('Rider Delivery Operations', () => {
  const riderService = new RiderService();

  describe('Delivery Assignment', () => {
    it('Rider receives delivery assignment via phone call from manager', async () => {
      const assignment = await riderService.receivePhoneAssignment({
        riderPhone: '+254723456789',
        orderId: 'ORD-001',
        customerName: 'John Doe',
        customerPhone: '+254712345678',
        address: '123 Kilimani Road',
        items: '2x Jameson 1L',
        notes: 'Call when at gate',
        assignedBy: 'Manager John',
      });

      expect(assignment.accepted).toBe(true);
      expect(assignment.riderConfirmed).toBe(true);
      expect(assignment.confirmationMethod).toBe('phone_call');
    });

    it('Rider accepts delivery via WhatsApp link', async () => {
      const link = riderService.generateAcceptanceLink({
        orderId: 'ORD-002',
        riderId: 'RDR-001',
      });

      expect(link).toContain('accept');
      expect(link).toContain('ORD-002');

      const acceptance = await riderService.acceptViaLink(link);
      expect(acceptance.success).toBe(true);
      expect(acceptance.riderConfirmed).toBe(true);
    });

    it('Rider confirms pickup via SMS when app unavailable', async () => {
      const confirmation = await riderService.confirmViaSMS({
        orderId: 'ORD-003',
        riderPhone: '+254723456789',
        action: 'picked_up',
        timestamp: new Date().toISOString(),
      });

      expect(confirmation.received).toBe(true);
      expect(confirmation.statusUpdated).toBe(true);
      expect(confirmation.customerNotified).toBe(true);
    });
  });

  describe('Offline Delivery Completion', () => {
    it('Rider marks delivery complete via phone call to manager', async () => {
      const completion = await riderService.completeViaPhoneReport({
        orderId: 'ORD-004',
        riderPhone: '+254723456789',
        reportedTo: 'Manager Jane',
        customerReceived: true,
        paymentCollected: true,
        amount: 5000,
        paymentMethod: 'cash',
        notes: 'Delivered to reception',
        timestamp: new Date().toISOString(),
      });

      expect(completion.recorded).toBe(true);
      expect(completion.status).toBe('delivered');
      expect(completion.inventoryUpdated).toBe(true);
    });

    it('Rider sends delivery photo via WhatsApp', async () => {
      const photoReport = await riderService.sendPhotoConfirmation({
        orderId: 'ORD-005',
        riderPhone: '+254723456789',
        photoUrl: 'https://cdn.example.com/delivery-001.jpg',
        location: { lat: -1.2921, lng: 36.8219 },
        timestamp: new Date().toISOString(),
      });

      expect(photoReport.received).toBe(true);
      expect(photoReport.geoTagged).toBe(true);
      expect(photoReport.attachedToOrder).toBe(true);
    });

    it('Failed delivery reported and rescheduled', async () => {
      const failed = await riderService.reportFailedDelivery({
        orderId: 'ORD-006',
        riderPhone: '+254723456789',
        reason: 'customer_not_available',
        attemptNumber: 1,
        reschedulePreferred: true,
        customerContactAttempted: true,
        notes: 'Called 3 times, no answer',
      });

      expect(failed.recorded).toBe(true);
      expect(failed.status).toBe('delivery_failed');
      expect(failed.rescheduleInitiated).toBe(true);
      expect(failed.managerNotified).toBe(true);
    });
  });

  describe('Payment Collection', () => {
    it('Rider collects M-Pesa payment and confirms code', async () => {
      const payment = await riderService.confirmMpesaCollection({
        orderId: 'ORD-007',
        riderPhone: '+254723456789',
        mpesaCode: 'ABC123XYZ',
        amount: 3500,
        customerPhone: '+254712345678',
        verified: true,
      });

      expect(payment.verified).toBe(true);
      expect(payment.reconciled).toBe(true);
      expect(payment.receiptGenerated).toBe(true);
    });

    it('Rider collects cash and records amount', async () => {
      const cash = await riderService.recordCashCollection({
        orderId: 'ORD-008',
        riderPhone: '+254723456789',
        amount: 5000,
        customerReceived: true,
        changeGiven: 0,
      });

      expect(cash.recorded).toBe(true);
      expect(cash.pendingReconciliation).toBe(true);
      expect(cash.managerNotified).toBe(true);
    });

    it('Partial payment - customer pays partial cash', async () => {
      const partial = await riderService.recordPartialPayment({
        orderId: 'ORD-009',
        riderPhone: '+254723456789',
        total: 5000,
        cashReceived: 2000,
        mpesaReceived: 2000,
        balance: 1000,
        customerCommittedToPay: true,
        notes: 'Will pay balance tomorrow',
      });

      expect(partial.recorded).toBe(true);
      expect(partial.balanceOutstanding).toBe(1000);
      expect(partial.customerLiabilityRecorded).toBe(true);
    });
  });

  describe('Rider Dashboard', () => {
    it('Rider sees all assigned deliveries including offline-booked', async () => {
      const dashboard = await riderService.getRiderDashboard('RDR-001');

      expect(dashboard.activeDeliveries).toBeDefined();
      expect(dashboard.completedToday).toBeGreaterThanOrEqual(0);
      expect(dashboard.earnings).toBeDefined();
      expect(dashboard.offlineAssignments).toBeDefined();
    });

    it('Rider can mark availability via SMS', async () => {
      const status = await riderService.updateAvailabilityViaSMS({
        riderPhone: '+254723456789',
        status: 'available',
        location: 'Westlands',
        timestamp: new Date().toISOString(),
      });

      expect(status.updated).toBe(true);
      expect(status.managerNotified).toBe(true);
      expect(status.assignmentQueueJoined).toBe(true);
    });

    it('Rider gets voice call for urgent assignments', async () => {
      const call = await riderService.initiateVoiceAssignment({
        orderId: 'ORD-URGENT',
        riderPhone: '+254723456789',
        customerAddress: '456 Lavington',
        urgency: 'high',
        autoAccept: false,
      });

      expect(call.initiated).toBe(true);
      expect(call.riderResponse).toBe('accepted'); // or 'declined', 'no_answer'
    });
  });

  describe('Delivery Tracking', () => {
    it('Customer receives tracking link even for offline-initiated delivery', async () => {
      const tracking = await riderService.generateCustomerTracking({
        orderId: 'ORD-010',
        customerPhone: '+254712345678',
        riderName: 'Mike',
        riderPhone: '+254723456789',
        estimatedArrival: new Date(Date.now() + 30 * 60000).toISOString(),
      });

      expect(tracking.url).toBeDefined();
      expect(tracking.smsSent).toBe(true);
      expect(tracking.noAppRequired).toBe(true);
      expect(tracking.liveUpdates).toBe(true);
    });

    it('Rider location shared via SMS updates', async () => {
      const locationUpdate = await riderService.shareLocationViaSMS({
        orderId: 'ORD-011',
        customerPhone: '+254712345678',
        location: 'Approaching Ngong Road',
        eta: '10 minutes',
      });

      expect(locationUpdate.sent).toBe(true);
      expect(locationUpdate.delivered).toBe(true);
    });
  });
});
