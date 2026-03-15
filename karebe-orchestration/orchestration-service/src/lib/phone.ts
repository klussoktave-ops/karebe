/**
 * Phone Number Utility Module (Backend)
 * 
 * Centralized phone number handling for Kenyan phone numbers.
 * All internal storage uses E.164 format (+254XXXXXXXXX).
 * External integrations (Mpesa, WhatsApp) use format-specific converters.
 */

import { parsePhoneNumber, isValidPhoneNumber as libIsValidPhoneNumber } from 'libphonenumber-js';
import type { NumberFormat } from 'libphonenumber-js';

// E164 format constant
const E164_FORMAT: NumberFormat = 'E.164';
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
 * Parse and normalize a phone number to E.164 format (+254XXXXXXXXX)
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

  const cleanedInput = phone.replace(/[\s\-()]/g, '');
  
  try {
    let parsed = parsePhoneNumberFromString(cleanedInput, 'KE');
    
    if (!parsed) {
      const withPrefix = cleanedInput.startsWith('+') ? cleanedInput : `+${cleanedInput}`;
      parsed = parsePhoneNumber(withPrefix);
    }
    
    if (!parsed && cleanedInput.startsWith('0')) {
      const withCountryCode = `+254${cleanedInput.slice(1)}`;
      parsed = parsePhoneNumber(withCountryCode);
    }
    
    if (!parsed && !cleanedInput.startsWith('+')) {
      parsed = parsePhoneNumber(`+${cleanedInput}`);
    }
    
    if (parsed && parsed.isValid()) {
      if (parsed.country === 'KE') {
        return { success: true, data: parsed.format(E164_FORMAT) };
      } else {
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
    
    return normalizePhoneKenya(phone);
    
  } catch (error) {
    return normalizePhoneKenya(phone);
  }
}

/**
 * Manual normalization for Kenyan phone numbers
 */
function normalizePhoneKenya(phone: string): PhoneResult<string> {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  cleaned = cleaned.replace(/^\+/, '');
  
  if (cleaned.startsWith('254')) {
    // Already has country code
  } else if (cleaned.startsWith('0')) {
    cleaned = `254${cleaned.slice(1)}`;
  } else if (cleaned.length === 9 && cleaned.startsWith('7')) {
    cleaned = `254${cleaned}`;
  } else {
    return { 
      success: false, 
      error: { type: 'INVALID_FORMAT', message: `Cannot parse phone number: ${phone}` } 
    };
  }
  
  if (cleaned.length !== 12 || !cleaned.startsWith('254')) {
    return { 
      success: false, 
      error: { type: 'INVALID_LENGTH', message: 'Kenyan phone must have 9 digits after country code' } 
    };
  }
  
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
 */
export function validatePhone(phone: string): boolean {
  const result = normalizePhone(phone);
  return result.success;
}

/**
 * Convert canonical E.164 format to Mpesa/Daraja API format
 * Mpesa requires: 254XXXXXXXXX (no + prefix)
 */
export function toMpesaFormat(phone: string): PhoneResult<string> {
  const normalized = normalizePhone(phone);
  
  if (!normalized.success) {
    return normalized;
  }
  
  const mpesaPhone = normalized.data.replace(/^\+/, '');
  return { success: true, data: mpesaPhone };
}

/**
 * Convert canonical E.164 format to WhatsApp API format
 * WhatsApp requires: 254XXXXXXXXX (no + prefix)
 */
export function toWhatsappFormat(phone: string): PhoneResult<string> {
  return toMpesaFormat(phone);
}

/**
 * Safely parse a phone number, returning null instead of throwing
 */
export function safeParsePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const result = normalizePhone(phone);
  return result.success ? result.data : null;
}

/**
 * Check if two phone numbers are equivalent
 */
export function phonesEqual(phone1: string, phone2: string): boolean {
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);
  
  if (!normalized1.success || !normalized2.success) {
    return false;
  }
  
  return normalized1.data === normalized2.data;
}

export default {
  normalizePhone,
  validatePhone,
  safeParsePhone,
  toMpesaFormat,
  toWhatsappFormat,
  phonesEqual,
  KENYA_COUNTRY_CODE,
  KENYA_PHONE_CODE,
};