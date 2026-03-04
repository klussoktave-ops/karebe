/**
 * WhatsApp Message Parser API
 * Receives WhatsApp messages via Mautrix webhook, parses order items,
 * and creates orders in the system
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

const router = Router();

/**
 * Parse order items from WhatsApp message
 */
interface ParsedItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  matched: boolean;
  productId?: string;
}

interface CustomerInfo {
  name?: string;
  phone?: string;
  address?: string;
}

/**
 * Known product patterns for matching
 */
const KNOWN_PRODUCT_PATTERNS = [
  { keywords: ['wine', 'red wine', 'white wine', 'rosé', 'sparkling'], category: 'wine' },
  { keywords: ['whisky', 'whiskey', 'vodka', 'gin', 'rum', 'brandy', 'cognac', 'tequila'], category: 'spirits' },
  { keywords: ['beer', 'tusker', 'guinness', 'heineken'], category: 'beer' },
  { keywords: ['champagne', 'port', 'sherry'], category: 'fortified' },
];

/**
 * Extract quantity from text
 */
function extractQuantity(text: string): number {
  const patterns = [
    /(\d+)\s*(bottles?|cases?|crates?|packs?|boxes?|sleeves?)/i,
    /(\d+)\s*[xX]/,
    /[xX](\d+)/,
    /(\d+)\s*(pcs?|pieces?)/i,
    /^(\d+)[\s\-]/m,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return 1;
}

/**
 * Extract price from text
 */
function extractPrice(text: string): number | undefined {
  const patterns = [
    /(?:KES?|KSh?)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    /(\d+(?:,\d{3})*)\s*[\/=]/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }
  
  return undefined;
}

/**
 * Match product name to known products
 */
function matchToKnownProduct(name: string): { productId: string; category: string } | null {
  const lower = name.toLowerCase();
  
  for (const { keywords, category } of KNOWN_PRODUCT_PATTERNS) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return {
          productId: `matched-${category}-${Date.now()}`,
          category,
        };
      }
    }
  }
  
  return null;
}

/**
 * Parse a single line to extract item details
 */
function parseLine(line: string): ParsedItem | null {
  let quantity = 1;
  let name = line.replace(/^[-•]\s*/, '').trim();
  let unitPrice: number | undefined;
  
  // Extract quantity
  quantity = extractQuantity(name);
  name = name.replace(/\d+\s*(bottles?|cases?|crates?|packs?|boxes?|sleeves?|pcs?|pieces?|[xX]\d+)/gi, '').trim();
  
  // Extract price
  unitPrice = extractPrice(name);
  name = name.replace(/(?:KES?|KSh?)\s*\d+(?:,\d{3})*/gi, '').replace(/\s*@\s*/, ' ').trim();
  
  if (!name || name.length < 2) {
    return null;
  }
  
  // Match against known products
  const matched = matchToKnownProduct(name);
  
  return {
    name,
    quantity,
    unitPrice,
    matched: !!matched,
    productId: matched?.productId,
  };
}

/**
 * Extract customer info from message
 */
function extractCustomerInfo(message: string): CustomerInfo {
  const result: CustomerInfo = {};
  
  // Extract name
  const nameMatch = message.match(/(?:name[:\s]+|my name is[:\s]+)([A-Za-z\s]+)/i);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }
  
  // Extract phone
  const phoneMatch = message.match(/(?:phone[:\s]+|tel[:\s]+|contact[:\s]+)?(\+?254\d{9}|0\d{9})/i);
  if (phoneMatch) {
    result.phone = phoneMatch[1].replace(/\D/g, '');
    if (!result.phone.startsWith('254')) {
      result.phone = '254' + result.phone.slice(-9);
    }
  }
  
  // Extract address
  const addressMatch = message.match(/(?:address[:\s]+|deliver(?:y|ing)? to[:\s]+)([A-Za-z0-9\s,]+)/i);
  if (addressMatch) {
    result.address = addressMatch[1].trim();
  }
  
  return result;
}

/**
 * Parse WhatsApp order message
 */
function parseWhatsAppOrderMessage(message: string): ParsedItem[] {
  const lines = message.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const items: ParsedItem[] = [];
  
  // Skip header/trailer lines
  const orderLines = lines.filter(line => {
    const lower = line.toLowerCase();
    return !lower.startsWith('hello') && 
           !lower.startsWith('hi') && 
           !lower.includes('would like to order') &&
           !lower.includes('total:') &&
           !lower.includes('please confirm') &&
           !lower.includes('thank you') &&
           !lower.includes('name:') &&
           !lower.includes('address:') &&
           !lower.includes('phone:');
  });
  
  // Also get bullet points
  const bulletLines = lines.filter(line => line.trim().startsWith('-'));
  
  const allLines = [...bulletLines, ...orderLines];
  
  for (const line of allLines) {
    const parsedItem = parseLine(line);
    if (parsedItem && parsedItem.quantity > 0) {
      items.push(parsedItem);
    }
  }
  
  return items;
}

/**
 * POST /api/whatsapp/parse
 * Parse a WhatsApp message and extract order items
 */
router.post('/parse',
  body('message').isString().notEmpty(),
  body('phone').optional().isString(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { message, phone } = req.body;
      
      // Parse items from message
      const items = parseWhatsAppOrderMessage(message);
      
      // Extract customer info
      const customerInfo = extractCustomerInfo(message);
      
      // Use provided phone or extracted
      const customerPhone = phone || customerInfo.phone;
      
      // Calculate total
      const total = items.reduce((sum, item) => {
        return sum + (item.unitPrice || 0) * item.quantity;
      }, 0);

      return res.status(200).json({
        success: true,
        data: {
          items,
          customer: customerInfo,
          summary: {
            itemCount: items.length,
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
            estimatedTotal: total,
          },
          rawMessage: message,
        },
      });
    } catch (error) {
      console.error('Error parsing WhatsApp message:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse message' 
      });
    }
  }
);

/**
 * POST /api/whatsapp/create-order
 * Parse message and create order directly
 */
router.post('/create-order',
  body('message').isString().notEmpty(),
  body('phone').optional().isString(),
  body('branchId').optional().isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { message, phone, branchId } = req.body;
      
      // Parse items from message
      const items = parseWhatsAppOrderMessage(message);
      
      if (items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No order items found in message',
        });
      }
      
      // Extract customer info
      const customerInfo = extractCustomerInfo(message);
      const customerPhone = phone || customerInfo.phone;
      
      if (!customerPhone) {
        return res.status(400).json({
          success: false,
          error: 'Customer phone number not found in message',
        });
      }
      
      // Calculate total
      const total = items.reduce((sum, item) => {
        return sum + (item.unitPrice || 0) * item.quantity;
      }, 0);
      
      // In a real implementation, this would create the order in Supabase
      // For now, return the parsed data that can be used to create an order
      const orderData = {
        customer_phone: customerPhone,
        customer_name: customerInfo.name || 'WhatsApp Customer',
        delivery_address: customerInfo.address || '',
        branch_id: branchId || '00000000-0000-0000-0000-000000000001',
        items: items.map(item => ({
          product_id: item.productId || 'unknown',
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice || 0,
        })),
        trigger_source: 'whatsapp',
        notes: `Parsed from WhatsApp message. Matched: ${items.filter(i => i.matched).length}/${items.length}`,
      };

      return res.status(201).json({
        success: true,
        data: {
          order: orderData,
          summary: {
            itemCount: items.length,
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
            estimatedTotal: total,
            matchedItems: items.filter(i => i.matched).length,
          },
        },
      });
    } catch (error) {
      console.error('Error creating order from WhatsApp:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create order from message' 
      });
    }
  }
);

/**
 * GET /api/whatsapp/test-parse
 * Test endpoint to see how a message would be parsed
 */
router.get('/test-parse', (req: Request, res: Response) => {
  const { message } = req.query;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Please provide a message query parameter',
    });
  }
  
  const items = parseWhatsAppOrderMessage(message);
  const customerInfo = extractCustomerInfo(message);
  const total = items.reduce((sum, item) => {
    return sum + (item.unitPrice || 0) * item.quantity;
  }, 0);
  
  return res.status(200).json({
    success: true,
    data: {
      items,
      customer: customerInfo,
      summary: {
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        estimatedTotal: total,
      },
    },
  });
});

export default router;
