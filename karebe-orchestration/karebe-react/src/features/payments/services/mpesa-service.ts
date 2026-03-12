/**
 * M-Pesa Payment Service
 * Handles STK push, payment status checking, and reconciliation
 */

export interface StkPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  tillNumber: string;
  callbackUrl?: string;
}

export interface StkPushResponse {
  success: boolean;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
  message: string;
}

export interface PaymentStatus {
  state: 'pending' | 'completed' | 'failed' | 'cancelled';
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  amount?: number;
  phoneNumber?: string;
  resultCode?: string;
  resultDesc?: string;
}

export interface ManualReconciliationResult {
  verified: boolean;
  matchedAmount: number;
  shortfall?: number;
  overpayment?: number;
  requiresAction: boolean;
  error?: string;
  originalOrderId?: string;
}

export interface PaymentGuide {
  steps: Array<{
    number: number;
    icon: string;
    text: string;
    highlighted?: boolean;
  }>;
}

export interface PaymentReminder {
  minutesRemaining: number;
  urgencyLevel: 'normal' | 'high' | 'critical';
  color: string;
  pulseAnimation: boolean;
  message: string;
}

export interface CheckoutDisplay {
  tillNumber: string;
  businessName: string;
  displayInstructions: string[];
  qrCodeUrl: string;
}

export interface PaymentUI {
  copyButton: boolean;
  tillNumberFormatted: string;
}

export class MpesaService {
  private usedMpesaCodes: Set<string> = new Set();
  private codeToOrderMap: Map<string, string> = new Map();

  /**
   * Initiate STK push to customer's phone
   */
  async initiateStkPush(request: StkPushRequest): Promise<StkPushResponse> {
    // In real implementation, this would call the M-Pesa API
    // For testing, return mock response
    
    const checkoutRequestId = `CHK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      checkoutRequestId,
      responseCode: '0',
      responseDescription: 'Success. Request accepted for processing',
      customerMessage: 'Enter your M-Pesa PIN to complete payment',
      message: 'Enter your M-Pesa PIN to complete payment',
    };
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(checkoutRequestId: string): Promise<PaymentStatus> {
    // Mock status check
    const statuses: PaymentStatus['state'][] = ['pending', 'completed', 'failed'];
    const state = statuses[Math.floor(Math.random() * statuses.length)];
    
    if (state === 'completed') {
      return {
        state,
        mpesaReceiptNumber: `MPE${Date.now()}`,
        transactionDate: new Date().toISOString(),
        amount: 3500,
        phoneNumber: '254712345678',
        resultCode: '0',
        resultDesc: 'The service request is processed successfully.',
      };
    }

    return { state };
  }

  /**
   * Reconcile manual M-Pesa code entry
   */
  async reconcileManualCode(params: {
    orderId: string;
    mpesaCode: string;
    amount: number;
    phoneNumber: string;
    expectedAmount?: number;
  }): Promise<ManualReconciliationResult> {
    // Check for duplicate code
    if (this.usedMpesaCodes.has(params.mpesaCode)) {
      return {
        verified: false,
        matchedAmount: 0,
        requiresAction: true,
        error: 'DUPLICATE_CODE',
        originalOrderId: this.codeToOrderMap.get(params.mpesaCode),
      };
    }

    // Mark code as used
    this.usedMpesaCodes.add(params.mpesaCode);
    this.codeToOrderMap.set(params.mpesaCode, params.orderId);

    const expectedAmount = params.expectedAmount || params.amount;
    const shortfall = expectedAmount > params.amount ? expectedAmount - params.amount : 0;
    const overpayment = params.amount > expectedAmount ? params.amount - expectedAmount : 0;

    return {
      verified: true,
      matchedAmount: params.amount,
      shortfall: shortfall > 0 ? shortfall : undefined,
      overpayment: overpayment > 0 ? overpayment : undefined,
      requiresAction: shortfall > 0 || overpayment > 0,
    };
  }

  /**
   * Get checkout display data
   */
  getCheckoutDisplay(params: {
    branchId: string;
    total: number;
  }): CheckoutDisplay {
    return {
      tillNumber: '123456',
      businessName: 'Karebe Wines & Spirits',
      displayInstructions: [
        'Lipa na M-Pesa',
        'Select Buy Goods and Services',
        'Enter Till Number',
        'Enter Amount',
      ],
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Till:123456`,
    };
  }

  /**
   * Get payment UI elements
   */
  getPaymentUI(tillNumber: string): PaymentUI {
    return {
      copyButton: true,
      tillNumberFormatted: this.formatTillNumber(tillNumber),
    };
  }

  /**
   * Get accessible display for high contrast
   */
  getAccessibleDisplay(params: {
    tillNumber: string;
    highContrast: boolean;
    largeText: boolean;
  }): {
    contrastRatio: number;
    fontSize: string;
    backgroundColor: string;
    textColor: string;
  } {
    return {
      contrastRatio: params.highContrast ? 7.0 : 4.5,
      fontSize: params.largeText ? '2rem' : '1rem',
      backgroundColor: params.highContrast ? '#000000' : '#FFFFFF',
      textColor: params.highContrast ? '#FFFFFF' : '#000000',
    };
  }

  /**
   * Get step-by-step payment guide
   */
  getPaymentGuide(tillNumber: string): PaymentGuide {
    return {
      steps: [
        { number: 1, icon: 'phone', text: 'Open M-Pesa on your phone' },
        { number: 2, icon: 'menu', text: 'Select Lipa na M-Pesa', highlighted: true },
        { number: 3, icon: 'cart', text: 'Select Buy Goods and Services' },
        { number: 4, icon: 'number', text: `Enter Till Number: ${tillNumber}`, highlighted: true },
        { number: 5, icon: 'money', text: 'Enter Amount and PIN' },
      ],
    };
  }

  /**
   * Get payment deadline reminder
   */
  getPaymentReminder(params: {
    orderCreatedAt: Date;
    timeoutMinutes: number;
  }): PaymentReminder {
    const elapsed = (Date.now() - params.orderCreatedAt.getTime()) / 60000;
    const minutesRemaining = Math.max(0, params.timeoutMinutes - elapsed);
    const percentageRemaining = minutesRemaining / params.timeoutMinutes;

    let urgencyLevel: PaymentReminder['urgencyLevel'] = 'normal';
    let color = 'green';
    let pulseAnimation = false;
    let message = `${Math.ceil(minutesRemaining)} minutes to complete payment`;

    if (percentageRemaining < 0.2) {
      urgencyLevel = 'critical';
      color = 'red';
      pulseAnimation = true;
      message = 'URGENT: Payment expires soon!';
    } else if (percentageRemaining < 0.5) {
      urgencyLevel = 'high';
      color = 'orange';
      message = 'Please complete payment soon';
    }

    return {
      minutesRemaining: Math.ceil(minutesRemaining),
      urgencyLevel,
      color,
      pulseAnimation,
      message,
    };
  }

  private formatTillNumber(tillNumber: string): string {
    if (tillNumber.length <= 6) {
      const mid = Math.ceil(tillNumber.length / 2);
      return `${tillNumber.slice(0, mid)} ${tillNumber.slice(mid)}`;
    }
    return tillNumber.replace(/(\d{5})(\d+)/, '$1 $2');
  }
}
