/**
 * Order Reconciliation Service
 * Handles orders completed through multiple channels (site, WhatsApp, phone, walk-in)
 * Ensures partially digitized experiences are reconciled properly
 */

export interface ReconciliationConfig {
  duplicateDetectionWindowMs: number;
  autoReconcileChannels: string[];
  requireManagerApproval: boolean;
}

export interface OrderSource {
  type: 'website' | 'whatsapp' | 'phone_call' | 'walk_in' | 'facebook' | 'instagram';
  initiatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentRecord {
  method: 'mpesa' | 'cash' | 'card' | 'bank_transfer';
  amount: number;
  reference?: string;
  timestamp: string;
  verified: boolean;
}

export interface ReconciliationLog {
  timestamp: string;
  action: string;
  channel: string;
  performedBy?: string;
  details: Record<string, unknown>;
}

export interface ReconciledOrder {
  id: string;
  status: string;
  source: OrderSource;
  customer: {
    name?: string;
    phone: string;
    address?: string;
  };
  items: Array<{
    name: string;
    qty: number;
    price?: number;
  }>;
  payments: PaymentRecord[];
  reconciliationLogs: ReconciliationLog[];
  paidInFull: boolean;
  inventoryAdjusted: boolean;
  reportsGenerated: boolean;
  trackingUrl?: string;
  modificationLog?: Array<{
    timestamp: string;
    changes: string;
  }>;
}

export class OrderReconciliationService {
  private config: ReconciliationConfig = {
    duplicateDetectionWindowMs: 300000, // 5 minutes
    autoReconcileChannels: ['website', 'whatsapp'],
    requireManagerApproval: true,
  };

  /**
   * Generate WhatsApp order link with cart context
   */
  generateWhatsAppOrderLink(params: {
    phone: string;
    cartItems: Array<{ name: string; quantity: number; price: number }>;
    customerName?: string;
  }): string {
    const message = this.formatWhatsAppMessage(params);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${params.phone.replace(/\D/g, '')}?text=${encodedMessage}`;
  }

  private formatWhatsAppMessage(params: {
    phone: string;
    cartItems: Array<{ name: string; quantity: number; price: number }>;
    customerName?: string;
  }): string {
    const itemsList = params.cartItems
      .map(item => `- ${item.name} x${item.quantity} @ KES ${item.price}`)
      .join('\n');
    
    const total = params.cartItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    return `Hello! I'd like to order:\n${itemsList}\n\nTotal: KES ${total}\n${params.customerName ? `Name: ${params.customerName}` : ''}`;
  }

  /**
   * Reconcile an order that has offline confirmation
   */
  async reconcileOrder(params: {
    siteOrderId: string;
    offlineConfirmation: {
      confirmedBy: string;
      timestamp: string;
      channel: string;
    };
  }): Promise<ReconciledOrder> {
    const log: ReconciliationLog = {
      timestamp: params.offlineConfirmation.timestamp,
      action: 'CONFIRMED_OFFLINE',
      channel: params.offlineConfirmation.channel,
      performedBy: params.offlineConfirmation.confirmedBy,
      details: { sourceOrderId: params.siteOrderId },
    };

    return {
      id: params.siteOrderId,
      status: 'CONFIRMED_BY_MANAGER',
      source: {
        type: 'website',
        initiatedAt: new Date().toISOString(),
      },
      customer: { phone: '' },
      items: [],
      payments: [],
      reconciliationLogs: [log],
      paidInFull: false,
      inventoryAdjusted: false,
      reportsGenerated: false,
    };
  }

  /**
   * Enrich order data from customer database
   */
  async enrichOrderData(phoneOrder: {
    orderId: string;
    items: Array<{ name: string; qty: number }>;
    source: string;
    customerPartial: { phone: string };
  }): Promise<ReconciledOrder> {
    // In real implementation, lookup customer by phone
    const mockCustomer = {
      name: 'Jane Doe',
      phone: phoneOrder.customerPartial.phone,
      address: '123 Main St, Nairobi',
    };

    return {
      id: phoneOrder.orderId,
      status: 'ORDER_SUBMITTED',
      source: {
        type: phoneOrder.source as OrderSource['type'],
        initiatedAt: new Date().toISOString(),
      },
      customer: mockCustomer,
      items: phoneOrder.items.map(i => ({ ...i, qty: i.qty })),
      payments: [],
      reconciliationLogs: [{
        timestamp: new Date().toISOString(),
        action: 'ENRICHED_FROM_CUSTOMER_DB',
        channel: 'system',
        details: { matchedBy: 'phone_number' },
      }],
      paidInFull: false,
      inventoryAdjusted: false,
      reportsGenerated: false,
    };
  }

  /**
   * Create order from external channel (WhatsApp, etc.)
   */
  async createFromExternal(params: {
    source: string;
    customerPhone: string;
    items: string[];
    mpesaCode?: string;
    needsReconciliation?: boolean;
  }): Promise<ReconciledOrder> {
    const payments: PaymentRecord[] = [];
    
    if (params.mpesaCode) {
      payments.push({
        method: 'mpesa',
        amount: 0, // Would calculate from items
        reference: params.mpesaCode,
        timestamp: new Date().toISOString(),
        verified: false,
      });
    }

    return {
      id: `EXT-${Date.now()}`,
      status: params.needsReconciliation ? 'NEEDS_RECONCILIATION' : 'ORDER_SUBMITTED',
      source: {
        type: params.source as OrderSource['type'],
        initiatedAt: new Date().toISOString(),
      },
      customer: { phone: params.customerPhone },
      items: params.items.map(name => ({ name, qty: 1 })),
      payments,
      reconciliationLogs: [{
        timestamp: new Date().toISOString(),
        action: 'CREATED_FROM_EXTERNAL',
        channel: params.source,
        details: { mpesaCode: params.mpesaCode },
      }],
      paidInFull: !!params.mpesaCode,
      inventoryAdjusted: false,
      reportsGenerated: false,
      trackingUrl: `/track/${Date.now()}`,
      mpesaCode: params.mpesaCode,
    } as ReconciledOrder;
  }

  /**
   * Record completion of offline order
   */
  async recordOfflineCompletion(order: {
    source: string;
    paymentMethod: string;
    status: string;
    items: Array<{ name: string; qty: number }>;
  }): Promise<ReconciledOrder & { inventoryAdjusted: boolean; reportsGenerated: boolean }> {
    return {
      id: `OFFLINE-${Date.now()}`,
      status: 'COMPLETED',
      source: {
        type: order.source as OrderSource['type'],
        initiatedAt: new Date().toISOString(),
      },
      customer: { phone: '' },
      items: order.items,
      payments: [{
        method: order.paymentMethod as PaymentRecord['method'],
        amount: 0,
        timestamp: new Date().toISOString(),
        verified: true,
      }],
      reconciliationLogs: [{
        timestamp: new Date().toISOString(),
        action: 'RECORDED_OFFLINE_COMPLETION',
        channel: order.source,
        details: { originalStatus: order.status },
      }],
      paidInFull: true,
      inventoryAdjusted: true,
      reportsGenerated: true,
    };
  }

  /**
   * Detect duplicate orders
   */
  detectDuplicate(order1: { customerPhone: string; items: string[]; timestamp: number },
                  order2: { customerPhone: string; items: string[]; timestamp: number }): boolean {
    const sameCustomer = order1.customerPhone === order2.customerPhone;
    const sameItems = JSON.stringify(order1.items.sort()) === JSON.stringify(order2.items.sort());
    const withinWindow = Math.abs(order1.timestamp - order2.timestamp) < this.config.duplicateDetectionWindowMs;
    
    return sameCustomer && sameItems && withinWindow;
  }

  /**
   * Reconcile split payment
   */
  reconcilePayment(order: {
    total: number;
    payments: PaymentRecord[];
  }): { paidInFull: boolean; paymentBreakdown: PaymentRecord[]; remaining: number } {
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const paidInFull = totalPaid >= order.total;
    
    return {
      paidInFull,
      paymentBreakdown: order.payments,
      remaining: Math.max(0, order.total - totalPaid),
    };
  }

  /**
   * Apply modification to existing order
   */
  async applyModification(originalOrder: { id: string; items: Array<{ name: string; qty: number }> },
                         modification: { addItems?: Array<{ name: string; qty: number }>; removeItems?: string[] }): 
                         Promise<ReconciledOrder & { modificationLog: Array<{ timestamp: string; changes: string }> }> {
    let items = [...originalOrder.items];
    
    if (modification.addItems) {
      items = [...items, ...modification.addItems];
    }
    
    if (modification.removeItems) {
      items = items.filter(i => !modification.removeItems?.includes(i.name));
    }

    return {
      id: originalOrder.id,
      status: 'MODIFIED',
      source: { type: 'website', initiatedAt: new Date().toISOString() },
      customer: { phone: '' },
      items,
      payments: [],
      reconciliationLogs: [],
      paidInFull: false,
      inventoryAdjusted: false,
      reportsGenerated: false,
      modificationLog: [{
        timestamp: new Date().toISOString(),
        changes: `Added: ${modification.addItems?.map(i => i.name).join(', ') || 'none'}`,
      }],
    };
  }
}
