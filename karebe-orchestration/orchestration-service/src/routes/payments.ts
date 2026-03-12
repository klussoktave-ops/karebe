// =============================================================================
// Payments API Routes (M-Pesa)
// =============================================================================

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

// =============================================================================
// M-Pesa STK Push
// =============================================================================

/**
 * POST /api/payments/daraja/stkpush
 * Initiate M-Pesa STK Push payment
 */
router.post('/daraja/stkpush', async (req: Request, res: Response) => {
  try {
    const { phone, amount, orderId, accountReference } = req.body;

    if (!phone || !amount || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Phone, amount, and orderId are required',
      });
    }

    // Get M-Pesa credentials from environment
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORT_CODE;
    const passkey = process.env.MPESA_PASSKEY;

    // If no credentials, return demo success
    if (!consumerKey || !consumerSecret || !shortCode || !passkey) {
      logger.warn('M-Pesa credentials not configured, returning demo response');
      
      // Create a pending payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          amount: amount,
          phone: phone,
          status: 'pending',
          payment_method: 'mpesa',
          transaction_id: 'DEMO-' + Date.now(),
        })
        .select()
        .single();

      if (paymentError) {
        logger.error('Error creating payment record', { error: paymentError });
      }

      return res.json({
        success: true,
        data: {
          merchantRequestId: 'DEMO-' + Date.now(),
          checkoutRequestId: 'DEMO-' + Date.now(),
          responseCode: '0',
          responseDescription: 'Success. Request accepted for processing',
          customerMessage: 'Success. Request accepted for processing',
        },
        demo: true,
      });
    }

    // Get access token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResponse = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get M-Pesa access token');
    }

    const tokenData = await tokenResponse.json() as { access_token: string };
    const accessToken = tokenData.access_token;

    // Prepare STK Push request
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

    const stkResponse = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerBuyGoodsOnline',
        Amount: Math.round(amount),
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL || 'https://karebe-orchestration-production.up.railway.app/api/payments/daraja/callback',
        AccountReference: accountReference || orderId,
        TransactionDesc: `Karebe Order ${orderId}`,
      }),
    });

    const stkData = await stkResponse.json() as {
      ResponseCode?: string;
      CheckoutRequestID?: string;
      ResponseDescription?: string;
    };

    if (stkData.ResponseCode === '0') {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          amount: amount,
          phone: phone,
          status: 'pending',
          payment_method: 'mpesa',
          transaction_id: stkData.CheckoutRequestID,
        })
        .select()
        .single();

      if (paymentError) {
        logger.error('Error creating payment record', { error: paymentError });
      }
    }

    res.json({
      success: stkData.ResponseCode === '0',
      data: stkData,
    });
  } catch (error) {
    logger.error('STK Push error', { error });
    res.status(500).json({
      success: false,
      error: 'Payment initiation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/payments/daraja/callback
 * M-Pesa callback for payment confirmation
 */
router.post('/daraja/callback', async (req: Request, res: Response) => {
  try {
    const { Body } = req.body;

    if (!Body || !Body.stkCallback) {
      return res.json({ success: true });
    }

    const callback = Body.stkCallback;
    const transactionId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    // Find payment by transaction ID
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (payment) {
      const status = resultCode === 0 ? 'completed' : 'failed';
      
      await supabase
        .from('payments')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      // If payment successful, update order status
      if (resultCode === 0 && payment.order_id) {
        await supabase
          .from('orders')
          .update({ 
            payment_status: 'paid',
            status: 'confirmed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.order_id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('M-Pesa callback error', { error });
    res.status(500).json({ success: false });
  }
});

export default router;
