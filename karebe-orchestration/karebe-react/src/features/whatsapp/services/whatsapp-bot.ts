/**
 * WhatsApp Bot Service for Karebe
 * Handles automated WhatsApp messages for order notifications
 */

const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const WHATSAPP_PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;

export interface WhatsAppMessageOptions {
  to: string;
  template: string;
  language?: string;
  variables?: Record<string, string | number>;
}

export interface WhatsAppTextMessage {
  to: string;
  body: string;
}

export class WhatsAppBot {
  private static baseUrl = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  private static headers = {
    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  /**
   * Send a templated WhatsApp message
   */
  static async sendTemplateMessage(options: WhatsAppMessageOptions): Promise<boolean> {
    try {
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(options.to),
        type: 'template',
        template: {
          name: options.template,
          language: {
            code: options.language || 'en',
          },
          components: options.variables
            ? [
                {
                  type: 'body',
                  parameters: Object.entries(options.variables).map(([_, value]) => ({
                    type: 'text',
                    text: String(value),
                  })),
                },
              ]
            : undefined,
        },
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('WhatsApp API error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send a text WhatsApp message
   */
  static async sendTextMessage(message: WhatsAppTextMessage): Promise<boolean> {
    try {
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(message.to),
        type: 'text',
        text: {
          body: message.body,
        },
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('WhatsApp API error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send order confirmation message
   */
  static async sendOrderConfirmation(
    phone: string,
    orderId: string,
    items: string,
    total: number
  ): Promise<boolean> {
    return this.sendTemplateMessage({
      to: phone,
      template: 'order_confirmation',
      variables: {
        order_id: orderId,
        items: items,
        total: `Ksh ${total.toLocaleString()}`,
      },
    });
  }

  /**
   * Send payment confirmation message
   */
  static async sendPaymentConfirmation(
    phone: string,
    orderId: string,
    amount: number,
    receiptNumber: string
  ): Promise<boolean> {
    return this.sendTemplateMessage({
      to: phone,
      template: 'payment_confirmed',
      variables: {
        order_id: orderId,
        amount: `Ksh ${amount.toLocaleString()}`,
        receipt: receiptNumber,
      },
    });
  }

  /**
   * Send order out for delivery message
   */
  static async sendOutForDelivery(
    phone: string,
    orderId: string,
    riderName: string,
    riderPhone: string,
    estimatedTime: string
  ): Promise<boolean> {
    return this.sendTemplateMessage({
      to: phone,
      template: 'out_for_delivery',
      variables: {
        order_id: orderId,
        rider_name: riderName,
        rider_phone: riderPhone,
        eta: estimatedTime,
      },
    });
  }

  /**
   * Send delivery completed message
   */
  static async sendDeliveryCompleted(
    phone: string,
    orderId: string,
    deliveredAt: string
  ): Promise<boolean> {
    return this.sendTemplateMessage({
      to: phone,
      template: 'delivery_completed',
      variables: {
        order_id: orderId,
        delivered_at: deliveredAt,
      },
    });
  }

  /**
   * Send payment reminder for pending orders
   */
  static async sendPaymentReminder(
    phone: string,
    orderId: string,
    amount: number,
    tillNumber: string
  ): Promise<boolean> {
    return this.sendTemplateMessage({
      to: phone,
      template: 'payment_reminder',
      variables: {
        order_id: orderId,
        amount: `Ksh ${amount.toLocaleString()}`,
        till_number: tillNumber,
      },
    });
  }

  /**
   * Format phone number for WhatsApp API
   * Converts 07xx or +254 to 2547xx format
   */
  private static formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1);
    }

    // If starts with +, remove it
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.slice(1);
    }

    // Ensure it starts with 254
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }

    return cleaned;
  }
}

/**
 * Webhook handler for incoming WhatsApp messages
 */
export class WhatsAppWebhookHandler {
  /**
   * Handle incoming message webhook
   */
  static async handleIncomingMessage(payload: any): Promise<void> {
    const { entry } = payload;

    if (!entry || !entry[0]?.changes[0]?.value?.messages) {
      return;
    }

    const messages = entry[0].changes[0].value.messages;

    for (const message of messages) {
      await this.processMessage(message);
    }
  }

  /**
   * Process a single incoming message
   */
  private static async processMessage(message: any): Promise<void> {
    const from = message.from;
    const type = message.type;

    if (type === 'text') {
      const text = message.text.body.toLowerCase();

      // Handle common commands
      if (text === 'status' || text === 'order') {
        await this.handleStatusRequest(from);
      } else if (text === 'help') {
        await this.handleHelpRequest(from);
      } else if (text === 'cancel') {
        await this.handleCancelRequest(from);
      } else {
        // Default: acknowledge message
        await WhatsAppBot.sendTextMessage({
          to: from,
          body: 'Thank you for your message. Type "help" for available commands.',
        });
      }
    }
  }

  /**
   * Handle order status request
   */
  private static async handleStatusRequest(phone: string): Promise<void> {
    // Fetch latest order for this phone
    // This would integrate with your order service
    await WhatsAppBot.sendTextMessage({
      to: phone,
      body: 'To check your order status, please reply with your order ID (e.g., ORD-123456).',
    });
  }

  /**
   * Handle help request
   */
  private static async handleHelpRequest(phone: string): Promise<void> {
    const helpText = `🍷 *Karebe Wines Help*

Available commands:
• *status* - Check your order status
• *help* - Show this message
• *cancel* - Request order cancellation

For assistance, call: 0700 123 456`;

    await WhatsAppBot.sendTextMessage({
      to: phone,
      body: helpText,
    });
  }

  /**
   * Handle cancel request
   */
  private static async handleCancelRequest(phone: string): Promise<void> {
    await WhatsAppBot.sendTextMessage({
      to: phone,
      body: 'To cancel your order, please provide your order ID and reason for cancellation. Our team will review your request.',
    });
  }
}