/**
 * WhatsApp Message Parser
 * Parses incoming WhatsApp messages to extract order items
 * Supports various formats customers might send
 */

export interface ParsedOrderItem {
  /** Product name (matched or raw) */
  name: string;
  /** Quantity specified */
  quantity: number;
  /** Unit price if found */
  unitPrice?: number;
  /** Whether this item was matched to a known product */
  matched: boolean;
  /** Product ID if matched */
  productId?: string;
}

/**
 * Known product patterns for matching
 */
const KNOWN_PRODUCT_PATTERNS = [
  // Wine patterns
  { pattern: /wine/i, category: 'wine' },
  { pattern: /red wine/i, category: 'red_wine' },
  { pattern: /white wine/i, category: 'white_wine' },
  { pattern: /ros[eé]/i, category: 'rose' },
  { pattern: /sparkling/i, category: 'sparkling' },
  
  // Spirit patterns
  { pattern: /whisky|whiskey/i, category: 'whisky' },
  { pattern: /vodka/i, category: 'vodka' },
  { pattern: /gin/i, category: 'gin' },
  { pattern: /rum/i, category: 'rum' },
  { pattern: /brandy|cognac/i, category: 'brandy' },
  { pattern: /tequila/i, category: 'tequila' },
  
  // Beer patterns
  { pattern: /beer/i, category: 'beer' },
  { pattern: /tusker/i, category: 'tusker' },
  { pattern: /guinness/i, category: 'guinness' },
  { pattern: /heineken/i, category: 'heineken' },
  
  // Other
  { pattern: /champagne/i, category: 'champagne' },
  { pattern: /port|sherry/i, category: 'fortified' },
];

/**
 * Quantity patterns
 */
const QUANTITY_PATTERNS = [
  // "2 bottles", "3 cases", "1 crate"
  /(\d+)\s*(bottles?|cases?|crates?|pack[s]?|boxes?|sleeves?)/i,
  // "2x", "3X"
  /(\d+)\s*[xX]\s*(?:(?!\d))/,
  // "x2", "x3"
  /[xX](\d+)/,
  // "2 pcs", "3 pieces"
  /(\d+)\s*(pcs?|pieces?)/i,
  // Just a number at start of line
  /^(\d+)[\s\-]/m,
];

/**
 * Price patterns
 */
const PRICE_PATTERNS = [
  // "KES 1500", "Ksh 1500", "KSh 1500"
  /(?:KES?|KSh?)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
  // "1500/=", "1500/="
  /(\d+(?:,\d{3})*)\s*[\/=]/,
  // "@ KES 1500"
  /@\s*(?:KES?\s*)?(\d+(?:,\d{3})*)/i,
];

/**
 * Parse a WhatsApp order message and extract items
 */
export function parseWhatsAppOrderMessage(message: string): ParsedOrderItem[] {
  const lines = message.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const items: ParsedOrderItem[] = [];
  
  // Skip header lines like "Hello! I would like to order:"
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
           !lower.includes('phone:') &&
           !line.startsWith('-');
  });
  
  // Also extract from bullet points
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
 * Parse a single line to extract item details
 */
function parseLine(line: string): ParsedOrderItem | null {
  let quantity = 1;
  let name = line.replace(/^[-•]\s*/, '').trim();
  let unitPrice: number | undefined;
  
  // Extract quantity
  for (const pattern of QUANTITY_PATTERNS) {
    const match = name.match(pattern);
    if (match) {
      quantity = parseInt(match[1], 10);
      // Remove the quantity from the name
      name = name.replace(pattern, '').trim();
      break;
    }
  }
  
  // Extract price
  for (const pattern of PRICE_PATTERNS) {
    const match = name.match(pattern);
    if (match) {
      unitPrice = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // Clean up the name
  name = name
    .replace(/@\s*(?:KES?\s*)?\d+(?:,\d{3})*/gi, '') // Remove @KES patterns
    .replace(/\s*x\d+\s*$/i, '') // Remove trailing xN
    .replace(/^\d+\s*[-–]\s*/, '') // Remove leading N-
    .trim();
  
  if (!name || name.length < 2) {
    return null;
  }
  
  // Match against known products
  const matched = matchToKnownProduct(name);
  
  return {
    name,
    quantity,
    unitPrice,
    matched,
    productId: matched ? matched.productId : undefined,
  };
}

/**
 * Match product name to known products
 */
function matchToKnownProduct(name: string): { productId: string; category: string } | null {
  const lower = name.toLowerCase();
  
  for (const { pattern, category } of KNOWN_PRODUCT_PATTERNS) {
    if (pattern.test(lower)) {
      // In a real implementation, this would look up from the product database
      return {
        productId: `matched-${category}-${Date.now()}`,
        category,
      };
    }
  }
  
  return null;
}

/**
 * Format parsed items into a message for confirmation
 */
export function formatParsedItemsForConfirmation(items: ParsedOrderItem[]): string {
  const lines = items.map((item, index) => {
    const price = item.unitPrice ? ` @ KES ${item.unitPrice}` : '';
    return `${index + 1}. ${item.name} x${item.quantity}${price}`;
  });
  
  const total = items.reduce((sum, item) => {
    return sum + (item.unitPrice || 0) * item.quantity;
  }, 0);
  
  return `Order Received:\n${lines.join('\n')}\n\nEstimated Total: KES ${total.toLocaleString()}\n\nWe'll confirm availability and delivery details shortly.`;
}

/**
 * Generate order confirmation message for customer
 */
export function generateOrderConfirmationMessage(
  items: ParsedOrderItem[],
  customerName?: string,
  deliveryAddress?: string
): string {
  const lines = items.map((item, index) => {
    const price = item.unitPrice ? ` @ KES ${item.unitPrice}` : '';
    return `${index + 1}. ${item.name} x${item.quantity}${price}`;
  });
  
  const total = items.reduce((sum, item) => {
    return sum + (item.unitPrice || 0) * item.quantity;
  }, 0);
  
  let message = `🎉 *Order Confirmed!*\n\n`;
  message += `Dear ${customerName || 'Customer'},\n\n`;
  message += `Your order:\n${lines.join('\n')}\n\n`;
  message += `*Total: KES ${total.toLocaleString()}*\n\n`;
  
  if (deliveryAddress) {
    message += `📍 Delivery: ${deliveryAddress}\n\n`;
  }
  
  message += `We'll notify you when your order is out for delivery.`;
  
  return message;
}

/**
 * Generate order rejection message
 */
export function generateOrderRejectionMessage(items: string[], reason: string): string {
  return `Sorry, we couldn't process your order.\n\nUnavailable items:\n${items.map(i => `- ${i}`).join('\n')}\n\nReason: ${reason}\n\nPlease let us know if you'd like to substitute with other products.`;
}

/**
 * Extract customer info from message
 */
export function extractCustomerInfo(message: string): {
  name?: string;
  phone?: string;
  address?: string;
} {
  const result: { name?: string; phone?: string; address?: string } = {};
  
  // Extract name: "Name: John Doe" or "My name is..."
  const nameMatch = message.match(/(?:name[:\s]+|my name is[:\s]+)([A-Za-z\s]+)/i);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }
  
  // Extract phone: Various formats
  const phoneMatch = message.match(/(?:phone[:\s]+|tel[:\s]+|contact[:\s]+)?(\+?254\d{9}|0\d{9})/i);
  if (phoneMatch) {
    result.phone = phoneMatch[1].replace(/\D/g, '');
    if (!result.phone.startsWith('254')) {
      result.phone = '254' + result.phone.slice(-9);
    }
  }
  
  // Extract address: "Address:" or "Deliver to..."
  const addressMatch = message.match(/(?:address[:\s]+|deliver(?:y|ing)? to[:\s]+)([A-Za-z0-9\s,]+)/i);
  if (addressMatch) {
    result.address = addressMatch[1].trim();
  }
  
  return result;
}
