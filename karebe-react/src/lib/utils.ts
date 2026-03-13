import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format price in KES
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Convert canonical E.164 format (+254XXXXXXXXX) to local Kenyan format (07XXXXXXXX)
 * 
 * @param phone - Canonical E.164 format (+254XXXXXXXXX)
 * @returns Local Kenyan format (07XXXXXXXX) or original if invalid
 */
export function toLocalKenyanFormat(phone: string): string {
  // Remove + prefix if present
  const cleaned = phone.replace(/^\+/, '');
  
  // Check if it's in the expected format (254 followed by 9 digits)
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    // Convert 254XXXXXXXXX to 07XXXXXXXX
    return `0${cleaned.slice(3)}`;
  }
  
  // Return original if format doesn't match expectations
  return phone;
}
