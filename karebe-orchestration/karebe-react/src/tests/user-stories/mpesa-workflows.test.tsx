import { describe, it, expect, beforeEach } from 'vitest';
import { MpesaService } from '../../features/payments/services/mpesa-service';
import { BranchMpesaManager } from '../../features/admin/services/branch-mpesa-manager';

/**
 * User Story: M-Pesa Payment Flows
 * As a customer, I can pay via M-Pesa using the correct till/paybill
 * As an admin, I can configure M-Pesa numbers per branch
 */
describe('M-Pesa Payment Workflows', () => {
  let mpesaService: MpesaService;
  let branchManager: BranchMpesaManager;

  beforeEach(() => {
    mpesaService = new MpesaService();
    branchManager = new BranchMpesaManager();
  });

  describe('Branch-specific M-Pesa Configuration', () => {
    it('Admin can set M-Pesa till number for branch', async () => {
      const config = await branchManager.setMpesaConfig({
        branchId: 'branch-nairobi-cbd',
        tillNumber: '123456',
        businessName: 'Karebe Wines CBD',
        isDefault: false,
      });

      expect(config.tillNumber).toBe('123456');
      expect(config.branchId).toBe('branch-nairobi-cbd');
    });

    it('Default M-Pesa number used when no branch specified', async () => {
      await branchManager.setMpesaConfig({
        branchId: 'default',
        tillNumber: '999999',
        businessName: 'Karebe Wines Main',
        isDefault: true,
      });

      const defaultConfig = await branchManager.getDefaultConfig();
      expect(defaultConfig.tillNumber).toBe('999999');
    });

    it('Correct M-Pesa number shown based on customer location', async () => {
      // Customer in Westlands sees Westlands branch till
      await branchManager.setMpesaConfig({
        branchId: 'branch-westlands',
        tillNumber: '111111',
        businessName: 'Karebe Westlands',
        serviceArea: ['Westlands', 'Parklands', 'Riverside'],
      });

      const nearbyBranch = await branchManager.findBranchByLocation('Westlands');
      expect(nearbyBranch?.tillNumber).toBe('111111');
    });

    it('Customer sees fallback when location not in service area', async () => {
      await branchManager.setMpesaConfig({
        branchId: 'default',
        tillNumber: '000000',
        businessName: 'Karebe Main',
        isDefault: true,
      });

      const config = await branchManager.getConfigForLocation('Mombasa');
      expect(config.tillNumber).toBe('000000'); // Fallback to default
    });
  });

  describe('Customer M-Pesa Checkout Experience', () => {
    it('Checkout page displays M-Pesa till number prominently', () => {
      const checkoutData = mpesaService.getCheckoutDisplay({
        branchId: 'branch-kilimani',
        total: 5000,
      });

      expect(checkoutData.tillNumber).toBeDefined();
      expect(checkoutData.displayInstructions).toContain('Lipa na M-Pesa');
      expect(checkoutData.qrCodeUrl).toBeDefined(); // For scanning
    });

    it('Copy-to-clipboard button for till number', () => {
      const ui = mpesaService.getPaymentUI('123456');
      expect(ui.copyButton).toBe(true);
      expect(ui.tillNumberFormatted).toBe('123 456');
    });

    it('Payment confirmation with STK push', async () => {
      const result = await mpesaService.initiateStkPush({
        phoneNumber: '254712345678',
        amount: 3500,
        accountReference: 'ORDER-123',
        tillNumber: '123456',
      });

      expect(result.success).toBe(true);
      expect(result.checkoutRequestId).toBeDefined();
      expect(result.message).toContain('Enter M-Pesa PIN');
    });

    it('Payment status polling', async () => {
      const status = await mpesaService.checkPaymentStatus('CHK-12345');
      
      expect(['pending', 'completed', 'failed']).toContain(status.state);
      if (status.state === 'completed') {
        expect(status.mpesaReceiptNumber).toBeDefined();
        expect(status.transactionDate).toBeDefined();
      }
    });
  });

  describe('Payment Reconciliation', () => {
    it('Manual payment code entry for offline payments', async () => {
      const reconciliation = await mpesaService.reconcileManualCode({
        orderId: 'ORDER-456',
        mpesaCode: 'ABC123XYZ',
        amount: 5000,
        phoneNumber: '254712345678',
      });

      expect(reconciliation.verified).toBe(true);
      expect(reconciliation.matchedAmount).toBe(5000);
    });

    it('Mismatch detection - wrong amount paid', async () => {
      const reconciliation = await mpesaService.reconcileManualCode({
        orderId: 'ORDER-789',
        mpesaCode: 'DEF456UVW',
        amount: 3000, // Order was 5000
        phoneNumber: '254712345678',
      });

      expect(reconciliation.verified).toBe(true);
      expect(reconciliation.matchedAmount).toBe(3000);
      expect(reconciliation.shortfall).toBe(2000);
      expect(reconciliation.requiresAction).toBe(true);
    });

    it('Duplicate code detection', async () => {
      // First use of code
      await mpesaService.reconcileManualCode({
        orderId: 'ORDER-111',
        mpesaCode: 'DUP123XYZ',
        amount: 4000,
        phoneNumber: '254712345678',
      });

      // Attempt to use same code again
      const duplicate = await mpesaService.reconcileManualCode({
        orderId: 'ORDER-222',
        mpesaCode: 'DUP123XYZ',
        amount: 4000,
        phoneNumber: '254798765432',
      });

      expect(duplicate.verified).toBe(false);
      expect(duplicate.error).toBe('DUPLICATE_CODE');
      expect(duplicate.originalOrderId).toBe('ORDER-111');
    });
  });

  describe('Visual Affordances for M-Pesa', () => {
    it('High contrast M-Pesa display for elderly users', () => {
      const accessibleUI = mpesaService.getAccessibleDisplay({
        tillNumber: '123456',
        highContrast: true,
        largeText: true,
      });

      expect(accessibleUI.contrastRatio).toBeGreaterThan(4.5);
      expect(accessibleUI.fontSize).toBe('2rem');
      expect(accessibleUI.backgroundColor).toBe('#000000');
      expect(accessibleUI.textColor).toBe('#FFFFFF');
    });

    it('Step-by-step visual guide for M-Pesa payment', () => {
      const guide = mpesaService.getPaymentGuide('123456');
      
      expect(guide.steps).toHaveLength(5);
      expect(guide.steps[0].icon).toBe('phone');
      expect(guide.steps[0].text).toContain('M-Pesa');
      expect(guide.steps[1].highlighted).toBe(true); // Till number step
      expect(guide.steps[1].text).toContain('123456');
    });

    it('Payment deadline reminder with visual urgency', () => {
      const reminder = mpesaService.getPaymentReminder({
        orderCreatedAt: new Date(Date.now() - 10 * 60000), // 10 min ago
        timeoutMinutes: 30,
      });

      expect(reminder.minutesRemaining).toBe(20);
      expect(reminder.urgencyLevel).toBe('normal');
      expect(reminder.color).toBe('green');

      // 25 minutes in
      const urgent = mpesaService.getPaymentReminder({
        orderCreatedAt: new Date(Date.now() - 25 * 60000),
        timeoutMinutes: 30,
      });

      expect(urgent.urgencyLevel).toBe('high');
      expect(urgent.color).toBe('red');
      expect(urgent.pulseAnimation).toBe(true);
    });
  });
});
