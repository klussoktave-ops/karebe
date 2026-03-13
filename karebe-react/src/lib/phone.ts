/**
 * Phone Number Utility Module
 * 
 * Centralized phone number handling for Kenyan phone numbers.
 * All internal storage uses E.164 format (+254XXXXXXXXX).
 * External integrations (Mpesa, WhatsApp) use format-specific converters.
 * 
 * Usage:
 *   import { normalizePhone, validatePhone, toMpesaFormat, toWhatsappFormat } from '@/lib/phone';
 */

import { parsePhoneNumber, isValidPhoneNumber as libIsValidPhoneNumber } from 'libphonenumber-js';
import { parsePhoneNumber as parsePhoneNumberFromString } from 'libphonenumber-js/min';

// Kenya country code
export const KENYA_COUNTRY_CODE = 'KE';
export const KENYA_PHONE_CODE = '254';

/**
 * Result type for phone operations that can fail
 */
export type PhoneResult<T> = 
  | { success: true; data: T }
  | { success: false; error: PhoneValidationError };

/**
 * Error types for phone validation
 */
export type PhoneValidationError = 
  | { type: 'INVALID_FORMAT'; message: string }
  | { type: 'INVALID_LENGTH'; message: string }
  | { type: 'INVALID_COUNTRY'; message: string }
  | { type: 'NOT_KENYA'; message: string }
  | { type: 'PARSE_ERROR'; message: string };

/**
 * Known Kenyan mobile network prefixes
 * Used for additional validation
 */
export const KENYA_MOBILE_PREFIXES = [
  '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', // Safaricom
  '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', // Airtel
  '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', // Telkom
];

/**
 * Parse and normalize a phone number to E.164 format (+254XXXXXXXXX)
 * 
 * Accepts multiple Kenyan formats:
 * - +254716854639
 * - 254716854639
 * - 0716854639
 * - 716854639
 * - +254 716 854 639
 * - 0716 854 639
 * 
 * @param phone - Raw phone number input
 * @returns PhoneResult with normalized E.164 format or error
 */
export function normalizePhone(phone: string): PhoneResult<string> {
  if (!phone || phone.trim() === '') {
    return { 
      success: false, 
      error: { type: 'INVALID_FORMAT', message: 'Phone number is required' } 
    };
  }

  // First, try parsing with libphonenumber-js
  const cleanedInput = phone.replace(/[\s\-()]/g, '');
  
  try {
    // Try parsing with default country
    let parsed = parsePhoneNumberFromString(cleanedInput, 'KE');
    
    // If that fails, try with +254 prefix
    if (!parsed) {
      const withPrefix = cleanedInput.startsWith('+') ? cleanedInput : `+${cleanedInput}`;
      parsed = parsePhoneNumber(withPrefix);
    }
    
    // If still not parsed, try with 0 prefix
    if (!parsed && cleanedInput.startsWith('0')) {
      const withCountryCode = `+254${cleanedInput.slice(1)}`;
      parsed = parsePhoneNumber(withCountryCode);
    }
    
    // Last attempt: add + prefix if missing
    if (!parsed && !cleanedInput.startsWith('+')) {
      parsed = parsePhoneNumber(`+${cleanedInput}`);
    }
    
    if (parsed && parsed.isValid()) {
      // Ensure it's a Kenyan number
      if (parsed.country === 'KE') {
        return { success: true, data: parsed.format('E164') };
      } else {
        // Check if it's a valid number that can be interpreted as Kenyan
        // Some numbers starting with 7 can be parsed as KE even without country code
        const nationalNumber = parsed.nationalNumber;
        if (nationalNumber?.toString().length === 9 && nationalNumber.toString().startsWith('7')) {
          return { success: true, data: `+254${nationalNumber}` };
        }
        return { 
          success: false, 
          error: { type: 'NOT_KENYA', message: 'Phone number must be a Kenyan mobile number' } 
        };
      }
    }
    
    // Fallback: manual processing for common Kenyan formats
    return normalizePhoneKenya(phone);
    
  } catch (error) {
    // Fallback to manual processing
    return normalizePhoneKenya(phone);
  }
}

/**
 * Manual normalization for Kenyan phone numbers
 * This is a fallback when libphonenumber-js cannot parse
 */
function normalizePhoneKenya(phone: string): PhoneResult<string> {
  // Remove all whitespace, dashes, parentheses
  let cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Remove + if present
  cleaned = cleaned.replace(/^\+/, '');
  
  // Handle different formats
  if (cleaned.startsWith('254')) {
    // Already has country code (254XXXXXXXXX)
    cleaned = cleaned;
  } else if (cleaned.startsWith('0')) {
    // Has leading zero (0XXXXXXXXX)
    cleaned = `254${cleaned.slice(1)}`;
  } else if (cleaned.length === 9 && cleaned.startsWith('7')) {
    // Just the 9 digits (XXXXXXXXX)
    cleaned = `254${cleaned}`;
  } else {
    return { 
      success: false, 
      error: { type: 'INVALID_FORMAT', message: `Cannot parse phone number: ${phone}` } 
    };
  }
  
  // Validate final format (should be 12 digits starting with 254)
  if (cleaned.length !== 12 || !cleaned.startsWith('254')) {
    return { 
      success: false, 
      error: { type: 'INVALID_LENGTH', message: 'Kenyan phone must have 9 digits after country code' } 
    };
  }
  
  // Validate it's a mobile number (starts with 7)
  const mobilePart = cleaned.slice(3);
  if (!mobilePart.startsWith('7')) {
    return { 
      success: false, 
      error: { type: 'INVALID_FORMAT', message: 'Kenyan phone number must start with 7' } 
    };
  }
  
  return { success: true, data: `+${cleaned}` };
}

/**
 * Validate if a phone number is a valid Kenyan mobile number
 * 
 * @param phone - Phone number to validate
 * @returns true if valid Kenyan mobile number
 */
export function validatePhone(phone: string): boolean {
  const result = normalizePhone(phone);
  return result.success;
}

/**
 * Safely parse a phone number, returning null instead of throwing
 * 
 * @param phone - Raw phone number input
 * @returns Normalized E.164 format or null if invalid
 */
export function safeParsePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const result = normalizePhone(phone);
  return result.success ? result.data : null;
}

/**
 * Convert canonical E.164 format to Mpesa/Daraja API format
 * Mpesa requires: 254XXXXXXXXX (no + prefix)
 * 
 * @param phone - Canonical E.164 format (+254XXXXXXXXX)
 * @returns Mpesa format (254XXXXXXXXX) or error
 */
export function toMpesaFormat(phone: string): PhoneResult<string> {
  const normalized = normalizePhone(phone);
  
  if (!normalized.success) {
    return normalized;
  }
  
  // Remove + prefix for Mpesa
  const mpesaPhone = normalized.data.replace(/^\+/, '');
  
  return { success: true, data: mpesaPhone };
}

/**
 * Convert canonical E.164 format to WhatsApp API format
 * WhatsApp requires: 254XXXXXXXXX (no + prefix)
 * 
 * @param phone - Canonical E.164 format (+254XXXXXXXXX)
 * @returns WhatsApp format (254XXXXXXXXX) or error
 */
export function toWhatsappFormat(phone: string): PhoneResult<string> {
  // Same as Mpesa format
  return toMpesaFormat(phone);
}

/**
 * Format phone for display (human-readable format)
 * Shows as: +254 716 854 639
 * 
 * @param phone - Canonical E.164 format
 * @returns Display format
 */
export function toDisplayFormat(phone: string): string {
  const normalized = normalizePhone(phone);
  
  if (!normalized.success) {
    return phone; // Return original if can't parse
  }
  
  // Format as +254 XXX XXX XXX
  const digits = normalized.data.replace(/^\+/, '');
  if (digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  
  return normalized.data;
}

/**
 * Extract phone from various input sources
 * Useful for parsing WhatsApp messages, contacts, etc.
 * 
 * @param input - Raw input that may contain a phone number
 * @returns Normalized phone or null
 */
export function extractPhone(input: string): string | null {
  // Common patterns in Kenyan phone numbers
  // +254XXXXXXXXX, 254XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXX
  const patterns = [
    /\+254(\d{9})/,           // +254XXXXXXXXX
    /(?:^|\s)254(\d{9})(?:\s|$)/, // 254XXXXXXXXX
    /(?:^|\s)0(\d{9})(?:\s|$)/,   // 0XXXXXXXXX
    /(?:^|\s)(\d{9})(?:\s|$)/,    // XXXXXXXXX
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const result = normalizePhone(match[0]);
      if (result.success) {
        return result.data;
      }
    }
  }
  
  return null;
}

/**
 * Get the network carrier from phone number (optional utility)
 * This is informational only - no validation
 * 
 * @param phone - Canonical E.164 format
 * @returns Network name or null
 */
export function getNetworkCarrier(phone: string): string | null {
  const normalized = normalizePhone(phone);
  
  if (!normalized.success) {
    return null;
  }
  
  // Extract the prefix (first 3 digits after country code)
  const digits = normalized.data.replace(/^\+/, '');
  const prefix = digits.slice(3, 5); // Get 2-digit prefix
  
  // Safaricom: 70-79
  if (['70', '71', '72', '73', '74', '75', '76', '77', '78', '79'].includes(prefix)) {
    return 'Safaricom';
  }
  
  // Airtel: 10-19
  if (['10', '11', '12', '13', '14', '15', '16', '17', '18', '19'].includes(prefix)) {
    return 'Airtel';
  }
  
  // Telekom: 20-29 (now owned by Airtel)
  if (['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'].includes(prefix)) {
    return 'Telkom';
  }
  
  return 'Unknown';
}

/**
 * Check if two phone numbers are equivalent
 * 
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns true if they represent the same number
 */
export function phonesEqual(phone1: string, phone2: string): boolean {
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);
  
  if (!normalized1.success || !normalized2.success) {
    return false;
  }
  
  return normalized1.data === normalized2.data;
}

// Re-export parse for direct usage if needed
export { parsePhoneNumber };

/**
 * Default export for convenience
 */
export default {
  normalizePhone,
  validatePhone,
  safeParsePhone,
  toMpesaFormat,
  toWhatsappFormat,
  toDisplayFormat,
  extractPhone,
  getNetworkCarrier,
  phonesEqual,
  KENYA_COUNTRY_CODE,
  KENYA_PHONE_CODE,
};