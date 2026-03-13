// =============================================================================
// Order Display Utilities
// Human-friendly order reference formatting and display helpers
// =============================================================================

/**
 * Order reference configuration (should match backend)
 */
export interface OrderDisplayConfig {
  prefix: string;
  defaultBranchCode: string;
}

const DEFAULT_DISPLAY_CONFIG: OrderDisplayConfig = {
  prefix: 'KRB',
  defaultBranchCode: 'M',
};

/**
 * Format order ID for display
 * Priority: order_reference > UUID suffix
 */
export function formatOrderDisplay(
  orderId: string,
  orderReference?: string | null,
  config: OrderDisplayConfig = DEFAULT_DISPLAY_CONFIG
): string {
  // Prefer numeric sequence from order reference (e.g., KRB-042 -> #0042)
  if (orderReference && orderReference.trim().length > 0) {
    const digits = orderReference.match(/\d+/g)?.join('') || '';
    if (digits.length > 0) {
      const seq = digits.slice(-4).padStart(4, '0');
      return `#${seq}`;
    }
  }

  // Fallback: derive a stable numeric suffix from UUID
  const hexSuffix = orderId.replace(/-/g, '').slice(-6);
  const numeric = parseInt(hexSuffix || '0', 16).toString().slice(-4).padStart(4, '0');
  return `#${numeric}`;
}

/**
 * Get order reference without the hash
 */
export function getOrderRef(orderId: string, orderReference?: string | null): string {
  return formatOrderDisplay(orderId, orderReference).replace('#', '');
}

/**
 * Parse order reference to extract sequence number
 */
export function parseOrderSequence(reference: string): number | null {
  const match = reference.match(/(\d{3})$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Calculate order age and determine urgency level
 */
export function getOrderUrgency(
  createdAt: string,
  status: string
): {
  ageMinutes: number;
  level: 'normal' | 'warning' | 'urgent';
  label: string;
} {
  const created = new Date(createdAt);
  const now = new Date();
  const ageMinutes = Math.floor((now.getTime() - created.getTime()) / 60000);
  
  // Define thresholds based on status
  const thresholds = {
    ORDER_SUBMITTED: { warning: 5, urgent: 15 },    // New order
    CONFIRMED_BY_MANAGER: { warning: 15, urgent: 30 }, // Confirmed/preparing
    DELIVERY_REQUEST_STARTED: { warning: 10, urgent: 20 }, // Ready for pickup
    OUT_FOR_DELIVERY: { warning: 30, urgent: 60 }, // Out for delivery
  };
  
  const threshold = thresholds[status as keyof typeof thresholds] || { warning: 30, urgent: 60 };
  
  let level: 'normal' | 'warning' | 'urgent' = 'normal';
  let label = `${ageMinutes}m`;
  
  if (ageMinutes >= threshold.urgent) {
    level = 'urgent';
    label = `${ageMinutes}m`;
  } else if (ageMinutes >= threshold.warning) {
    level = 'warning';
  }
  
  return { ageMinutes, level, label };
}

/**
 * Format relative time with more detail
 */
export function formatOrderAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  // If older than a day, show date
  return created.toLocaleDateString('en-KE', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as +254 XXX XXX XXX
  if (digits.startsWith('254')) {
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  
  if (digits.startsWith('0')) {
    return `+254 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  
  // Return as-is if can't parse
  return phone;
}

/**
 * Get delivery method display
 */
export function getDeliveryMethodDisplay(
  deliveryMethod?: 'delivery' | 'pickup',
  hasAddress?: boolean
): { label: string; icon: string } {
  if (!deliveryMethod) {
    // Infer from address presence
    return hasAddress 
      ? { label: 'Delivery', icon: '🚗' }
      : { label: 'Pickup', icon: '🏪' };
  }
  
  return deliveryMethod === 'delivery'
    ? { label: 'Delivery', icon: '🚗' }
    : { label: 'Pickup', icon: '🏪' };
}

/**
 * Get item count display
 */
export function formatItemCount(count?: number): string {
  if (!count || count === 0) return 'No items';
  if (count === 1) return '1 item';
  return `${count} items`;
}

/**
 * Get price display
 */
export function formatPrice(amount: number, currency: string = 'KES'): string {
  return `${currency} ${amount.toLocaleString()}`;
}
