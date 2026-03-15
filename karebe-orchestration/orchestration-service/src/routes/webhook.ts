// =============================================================================
// Webhook Routes
// Handles mautrix-whatsapp and other webhook events
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { orderService } from '../services/orderService';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import {
  ActorType,
  ConfirmationMethod,
  OrderStatus,
  MautrixWebhookPayload,
} from '../types/order';

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const mautrixWebhookSchema = z.object({
  event_id: z.string(),
  room_id: z.string(),
  sender: z.string(),
  content: z.object({
    body: z.string(),
    msgtype: z.string(),
  }),
  timestamp: z.number(),
});

// =============================================================================
// Webhook Processing Service
// =============================================================================

class WebhookProcessor {
  /**
   * Process mautrix-whatsapp webhook
   */
  async processMautrixEvent(payload: MautrixWebhookPayload): Promise<{ 
    success: boolean; 
    action?: string; 
    orderId?: string;
    message?: string;
  }> {
    // Check for duplicate event
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id, status')
      .eq('event_id', payload.event_id)
      .single();

    if (existingEvent) {
      logger.info('Duplicate webhook event ignored', { eventId: payload.event_id });
      return { success: true, message: 'Duplicate event ignored' };
    }

    // Log the event
    await supabase.from('webhook_events').insert({
      event_id: payload.event_id,
      event_type: 'mautrix_message',
      source: 'mautrix',
      payload: payload as unknown as Record<string, unknown>,
      status: 'processing',
    });

    try {
      // Extract phone number from sender
      const phoneNumber = this.extractPhoneNumber(payload.sender);
      if (!phoneNumber) {
        await this.markEventProcessed(payload.event_id, 'ignored', 'Invalid sender format');
        return { success: false, message: 'Invalid sender format' };
      }

      // Determine intent from message body
      const message = payload.content.body.trim().toUpperCase();
      const intent = this.parseIntent(message);

      // Find associated rider or order
      const result = await this.handleIntent(intent, phoneNumber, message, payload);
      
      await this.markEventProcessed(
        payload.event_id, 
        'completed', 
        undefined,
        result.orderId,
        result.action
      );

      return result;
    } catch (error) {
      logger.error('Error processing webhook', { error, payload });
      await this.markEventProcessed(
        payload.event_id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Extract phone number from Matrix user ID
   * Format: @whatsapp_254712345678:matrix.example.com
   */
  private extractPhoneNumber(sender: string): string | null {
    const match = sender.match(/whatsapp_(\d+):/);
    return match ? match[1] : null;
  }

  /**
   * Parse intent from message
   */
  private parseIntent(message: string): 'CONFIRM' | 'REJECT' | 'DELIVERED' | 'START' | 'STATUS' | 'UNKNOWN' {
    const confirmKeywords = ['YES', 'CONFIRM', 'ACCEPT', 'OK', 'NDIO', 'SAWA'];
    const rejectKeywords = ['NO', 'REJECT', 'DECLINE', 'CANCEL', 'HAPANA'];
    const deliveredKeywords = ['DELIVERED', 'DONE', 'COMPLETE', 'FINISHED', 'IMEFIKA'];
    const startKeywords = ['START', 'OMW', 'OTW', 'ON MY WAY', 'NAENDA'];
    const statusKeywords = ['STATUS', 'STATE', 'ORDER', 'ORDER ID'];

    if (confirmKeywords.some(k => message.includes(k))) return 'CONFIRM';
    if (rejectKeywords.some(k => message.includes(k))) return 'REJECT';
    if (deliveredKeywords.some(k => message.includes(k))) return 'DELIVERED';
    if (startKeywords.some(k => message.includes(k))) return 'START';
    if (statusKeywords.some(k => message.includes(k))) return 'STATUS';
    
    return 'UNKNOWN';
  }

  /**
   * Handle parsed intent
   */
  private async handleIntent(
    intent: string,
    phoneNumber: string,
    message: string,
    payload: MautrixWebhookPayload
  ): Promise<{ success: boolean; action: string; orderId?: string }> {
    switch (intent) {
      case 'CONFIRM':
        return this.handleRiderConfirmation(phoneNumber, payload);
      case 'REJECT':
        return this.handleRiderRejection(phoneNumber, payload);
      case 'DELIVERED':
        return this.handleDeliveryComplete(phoneNumber, payload);
      case 'START':
        return this.handleStartDelivery(phoneNumber, payload);
      case 'STATUS':
        return this.handleStatusRequest(phoneNumber, message);
      default:
        return { success: false, action: 'UNKNOWN_INTENT' };
    }
  }

  /**
   * Handle rider confirmation via WhatsApp
   */
  private async handleRiderConfirmation(
    phoneNumber: string,
    payload: MautrixWebhookPayload
  ): Promise<{ success: boolean; action: string; orderId?: string }> {
    // Find rider by phone
    const { data: rider } = await supabase
      .from('riders')
      .select('id, user_id')
      .eq('phone', phoneNumber)
      .single();

    if (!rider) {
      logger.warn('Rider not found for phone', { phoneNumber });
      return { success: false, action: 'RIDER_NOT_FOUND' };
    }

    // Find active order for this rider
    const { data: availability } = await supabase
      .from('rider_availability')
      .select('current_order_id')
      .eq('rider_id', rider.id)
      .single();

    if (!availability?.current_order_id) {
      return { success: false, action: 'NO_ACTIVE_ORDER' };
    }

    const orderId = availability.current_order_id;

    try {
      await orderService.confirmRider(orderId, {
        confirmation_method: ConfirmationMethod.DIGITAL,
        actor_type: ActorType.WEBHOOK,
        actor_id: rider.user_id,
      });

      return { success: true, action: 'RIDER_CONFIRMED', orderId };
    } catch (error) {
      if (error instanceof Error && error.name === 'StateTransitionError') {
        // Order may already be confirmed
        return { success: true, action: 'ALREADY_CONFIRMED', orderId };
      }
      throw error;
    }
  }

  /**
   * Handle rider rejection
   */
  private async handleRiderRejection(
    phoneNumber: string,
    payload: MautrixWebhookPayload
  ): Promise<{ success: boolean; action: string; orderId?: string }> {
    const { data: rider } = await supabase
      .from('riders')
      .select('id, user_id')
      .eq('phone', phoneNumber)
      .single();

    if (!rider) {
      return { success: false, action: 'RIDER_NOT_FOUND' };
    }

    const { data: availability } = await supabase
      .from('rider_availability')
      .select('current_order_id')
      .eq('rider_id', rider.id)
      .single();

    if (!availability?.current_order_id) {
      return { success: false, action: 'NO_ACTIVE_ORDER' };
    }

    const orderId = availability.current_order_id;

    // Release rider and put order back to CONFIRMED_BY_MANAGER
    await supabase
      .from('rider_availability')
      .update({
        status: 'AVAILABLE',
        current_order_id: null,
        last_updated: new Date().toISOString(),
      })
      .eq('rider_id', rider.id);

    await orderService.updateOrderStatus(orderId, {
      status: OrderStatus.CONFIRMED_BY_MANAGER,
      actor_type: ActorType.WEBHOOK,
      actor_id: rider.user_id,
      metadata: {
        rejection_reason: 'Rider declined via WhatsApp',
        previous_rider_id: rider.id,
      },
    });

    return { success: true, action: 'RIDER_REJECTED', orderId };
  }

  /**
   * Handle delivery completion
   */
  private async handleDeliveryComplete(
    phoneNumber: string,
    payload: MautrixWebhookPayload
  ): Promise<{ success: boolean; action: string; orderId?: string }> {
    const { data: rider } = await supabase
      .from('riders')
      .select('id, user_id')
      .eq('phone', phoneNumber)
      .single();

    if (!rider) {
      return { success: false, action: 'RIDER_NOT_FOUND' };
    }

    const { data: availability } = await supabase
      .from('rider_availability')
      .select('current_order_id')
      .eq('rider_id', rider.id)
      .single();

    if (!availability?.current_order_id) {
      return { success: false, action: 'NO_ACTIVE_ORDER' };
    }

    const orderId = availability.current_order_id;

    await orderService.completeDelivery(orderId, ActorType.WEBHOOK, rider.user_id);

    return { success: true, action: 'DELIVERY_COMPLETED', orderId };
  }

  /**
   * Handle start delivery
   */
  private async handleStartDelivery(
    phoneNumber: string,
    payload: MautrixWebhookPayload
  ): Promise<{ success: boolean; action: string; orderId?: string }> {
    const { data: rider } = await supabase
      .from('riders')
      .select('id, user_id')
      .eq('phone', phoneNumber)
      .single();

    if (!rider) {
      return { success: false, action: 'RIDER_NOT_FOUND' };
    }

    const { data: availability } = await supabase
      .from('rider_availability')
      .select('current_order_id')
      .eq('rider_id', rider.id)
      .single();

    if (!availability?.current_order_id) {
      return { success: false, action: 'NO_ACTIVE_ORDER' };
    }

    const orderId = availability.current_order_id;

    await orderService.startDelivery(orderId, ActorType.WEBHOOK, rider.user_id);

    return { success: true, action: 'DELIVERY_STARTED', orderId };
  }

  /**
   * Handle status request
   */
  private async handleStatusRequest(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; action: string; orderId?: string }> {
    // Extract order ID from message if present
    const orderIdMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    
    if (orderIdMatch) {
      const order = await orderService.getOrder(orderIdMatch[0]);
      if (order) {
        return { success: true, action: 'STATUS_PROVIDED', orderId: order.id };
      }
    }

    // Find rider's active order
    const { data: rider } = await supabase
      .from('riders')
      .select('id')
      .eq('phone', phoneNumber)
      .single();

    if (rider) {
      const { data: availability } = await supabase
        .from('rider_availability')
        .select('current_order_id')
        .eq('rider_id', rider.id)
        .single();

      if (availability?.current_order_id) {
        return { success: true, action: 'STATUS_PROVIDED', orderId: availability.current_order_id };
      }
    }

    return { success: false, action: 'NO_ORDER_FOUND' };
  }

  /**
   * Mark webhook event as processed
   */
  private async markEventProcessed(
    eventId: string,
    status: 'completed' | 'failed' | 'ignored',
    errorMessage?: string,
    orderId?: string,
    action?: string
  ): Promise<void> {
    await supabase
      .from('webhook_events')
      .update({
        status,
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
        resulting_order_id: orderId,
        resulting_action: action,
      })
      .eq('event_id', eventId);
  }
}

const webhookProcessor = new WebhookProcessor();

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/webhook/mautrix
 * Receive mautrix-whatsapp events
 */
router.post('/mautrix', async (req: Request, res: Response) => {
  try {
    // Verify webhook secret
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.MAUTRIX_WEBHOOK_SECRET) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validation = mautrixWebhookSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        details: validation.error.errors,
      });
    }

    const result = await webhookProcessor.processMautrixEvent(validation.data);

    res.json({
      success: result.success,
      action: result.action,
      order_id: result.orderId,
      message: result.message,
    });
  } catch (error) {
    logger.error('Webhook processing error', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Internal error',
    });
  }
});

/**
 * GET /api/webhook/health
 * Health check
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;