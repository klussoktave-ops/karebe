import { supabase } from './supabase';

/**
 * Image Utility Functions
 * 
 * Provides robust image handling with:
 * - Automatic placeholder generation using Picsum
 * - Debug logging for all image operations
 * - Image URL validation
 * - Shareable image URLs for external sites
 */

// Debug logging
const debugLog = (context: string, data: Record<string, unknown>, isError = false) => {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '[ImageUtils ERROR]' : '[ImageUtils]';
  console.log(`${prefix} [${timestamp}] ${context}:`, JSON.stringify(data, null, 2));
};

/**
 * Default placeholder image service
 * Uses picsum.photos for reliable placeholder images
 */
const PLACEHOLDER_SERVICES = {
  picsum: (seed: string, width = 400, height = 400) => 
    `https://picsum.photos/seed/${seed}/${width}/${height}`,
  placeholder: (text: string) => 
    `https://placehold.co/400x400/e2e8f0/64748b?text=${encodeURIComponent(text)}`,
};

/**
 * Get a placeholder image URL
 * Uses product name as seed for consistent image per product
 */
export function getPlaceholderImage(
  productName: string, 
  category?: string,
  width = 400, 
  height = 400
): string {
  const seed = productName.toLowerCase().replace(/\s+/g, '-').substring(0, 30);
  const url = PLACEHOLDER_SERVICES.picsum(seed, width, height);
  
  debugLog('Generated placeholder', {
    productName,
    category,
    seed,
    width,
    height,
    url,
  });
  
  return url;
}

/**
 * Get best available image URL for a product
 * Priority:
 * 1. First valid product image from Supabase/storage
 * 2. Check if Supabase is configured but no images added
 * 3. Category-based placeholder
 * 4. Generic placeholder
 * 
 * Debug output explains WHY the fallback was used
 */
export function getProductImage(
  images: string[] | undefined,
  productName: string,
  category?: string,
  options: { width?: number; height?: number; debug?: boolean } = {}
): { 
  url: string; 
  source: 'image' | 'category-placeholder' | 'default-placeholder';
  debug: Record<string, unknown>;
} {
  const { width = 400, height = 400, debug = true } = options;
  const debugInfo: Record<string, unknown> = {
    inputImages: images,
    productName,
    category,
    supabaseConfigured: !!supabase,
    timestamp: new Date().toISOString(),
  };

  // Priority 1: Use first valid image from array
  if (images && images.length > 0 && images[0]) {
    const imageUrl = images[0];
    
    // Validate the image URL - only use if it's a valid http/https URL
    const isValidUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
    
    if (!isValidUrl) {
      debugInfo.skippingImage = true;
      debugInfo.skipReason = 'Invalid image URL - not a valid http/https URL';
      debugInfo.invalidUrl = imageUrl;
      // Continue to fallback logic instead of using invalid URL
    } else {
      debugInfo.source = 'image';
      debugInfo.imageUrl = imageUrl;
      debugInfo.reason = 'Product has valid image in images array';
      
      if (debug) {
        debugLog('Using product image', debugInfo);
      }
      
      return { url: imageUrl, source: 'image', debug: debugInfo };
    }
  }

  // Priority 2a: Check if images array is empty but Supabase IS configured
  // This means user likely forgot to add images for this product
  if (supabase && (!images || images.length === 0)) {
    debugInfo.source = 'category-placeholder';
    debugInfo.reason = 'Supabase is configured but NO images added for this product';
    debugInfo.solution = 'Add images via Edit Product form in admin panel';
    debugInfo.supabaseStatus = 'connected';
    debugInfo.imagesArrayStatus = 'empty or undefined';
    
    const placeholderUrl = getPlaceholderImage(productName, category, width, height);
    debugInfo.placeholderUrl = placeholderUrl;
    debugInfo.placeholderSource = 'picsum.photos';
    
    if (debug) {
      debugLog('Image not showing: Supabase configured but no images added', debugInfo);
    }
    
    return { url: placeholderUrl, source: 'category-placeholder', debug: debugInfo };
  }

  // Priority 2b: Supabase not configured at all
  if (!supabase) {
    debugInfo.source = 'category-placeholder';
    debugInfo.reason = 'Supabase is NOT configured - running in demo/offline mode';
    debugInfo.solution = 'Configure Supabase credentials in .env file';
    debugInfo.supabaseStatus = 'not configured';
    debugInfo.imagesArrayStatus = images ? (images.length === 0 ? 'empty array' : 'has items but none valid') : 'undefined';
    
    const placeholderUrl = getPlaceholderImage(productName, category, width, height);
    debugInfo.placeholderUrl = placeholderUrl;
    debugInfo.placeholderSource = 'picsum.photos (fallback)';
    
    if (debug) {
      debugLog('Image not showing: Supabase not configured', debugInfo);
    }
    
    return { url: placeholderUrl, source: 'category-placeholder', debug: debugInfo };
  }

  // Priority 3: Category-based placeholder (fallback for any other case)
  if (category) {
    const placeholderUrl = getPlaceholderImage(productName, category, width, height);
    debugInfo.source = 'category-placeholder';
    debugInfo.reason = 'Using category-based placeholder as fallback';
    debugInfo.placeholderUrl = placeholderUrl;
    
    if (debug) {
      debugLog('Using category placeholder', debugInfo);
    }
    
    return { url: placeholderUrl, source: 'category-placeholder', debug: debugInfo };
  }

  // Priority 4: Generic placeholder
  const defaultPlaceholder = getPlaceholderImage('product', undefined, width, height);
  debugInfo.source = 'default-placeholder';
  debugInfo.reason = 'Using generic placeholder - no category available';
  debugInfo.placeholderUrl = defaultPlaceholder;
  
  if (debug) {
    debugLog('Using default placeholder', debugInfo);
  }
  
  return { url: defaultPlaceholder, source: 'default-placeholder', debug: debugInfo };
}

/**
 * Validate if an image URL is accessible
 * Returns detailed debug information
 */
export async function validateImageUrl(
  url: string
): Promise<{
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
  url: string;
  checks: Record<string, boolean>;
}> {
  const checks: Record<string, boolean> = {
    isDataUrl: url.startsWith('data:'),
    isAbsoluteUrl: url.startsWith('http://') || url.startsWith('https://'),
    isRelativeUrl: !url.startsWith('http') && !url.startsWith('data:'),
    hasExtension: /\.(jpg|jpeg|png|gif|webp|svg)/i.test(url),
    isSupabaseUrl: url.includes('supabase'),
    isPicsumUrl: url.includes('picsum'),
    isPlaceholderUrl: url.includes('placehold'),
  };

  debugLog('Validating image URL', { url, checks });

  // Handle data URLs
  if (url.startsWith('data:')) {
    return { valid: true, url, checks };
  }

  // Handle relative URLs
  if (checks.isRelativeUrl) {
    return { 
      valid: false, 
      url, 
      error: 'Relative URL not supported for validation',
      checks,
    };
  }

  // Test with Image object
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      debugLog('Image validation timeout', { url }, true);
      resolve({ 
        valid: false, 
        url, 
        error: 'Load timeout (10s)',
        checks,
      });
    }, 10000);

    img.onload = () => {
      clearTimeout(timeout);
      debugLog('Image validated successfully', { 
        url, 
        width: img.width, 
        height: img.height 
      });
      resolve({ 
        valid: true, 
        url, 
        width: img.width, 
        height: img.height,
        checks,
      });
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      const errorMsg = 'Failed to load - URL may be invalid, expired, or CORS blocked';
      debugLog('Image validation failed', { url, error: errorMsg }, true);
      resolve({ 
        valid: false, 
        url, 
        error: errorMsg,
        checks,
      });
    };
    
    img.src = url;
  });
}

/**
 * Check if Supabase storage is properly configured
 */
export async function checkSupabaseStorage(): Promise<{
  configured: boolean;
  bucketExists: boolean;
  publicUrl: string | null;
  debug: Record<string, unknown>;
}> {
  const debugInfo: Record<string, unknown> = {
    supabaseExists: !!supabase,
    timestamp: new Date().toISOString(),
  };

  if (!supabase) {
    debugLog('Supabase not configured - demo mode', debugInfo);
    return { 
      configured: false, 
      bucketExists: false, 
      publicUrl: null,
      debug: debugInfo,
    };
  }

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      debugInfo.bucketListError = error.message;
      debugLog('Failed to list buckets', debugInfo, true);
      return { 
        configured: true, 
        bucketExists: false, 
        publicUrl: null,
        debug: debugInfo,
      };
    }

    const productImagesBucket = buckets?.find(b => b.name === 'product_images');
    const bucketExists = !!productImagesBucket;
    
    debugInfo.bucketExists = bucketExists;
    debugInfo.availableBuckets = buckets?.map(b => b.name);
    
    let samplePublicUrl: string | null = null;
    if (bucketExists) {
      debugInfo.bucketPublic = productImagesBucket?.public;
      // Get a sample public URL
      const { data } = supabase.storage
        .from('product_images')
        .getPublicUrl('test');
      samplePublicUrl = data?.publicUrl || null;
      debugInfo.samplePublicUrl = samplePublicUrl;
    }

    debugLog('Supabase storage check complete', debugInfo);
    
    return { 
      configured: true, 
      bucketExists, 
      publicUrl: samplePublicUrl,
      debug: debugInfo,
    };
  } catch (err) {
    debugInfo.exception = err instanceof Error ? err.message : 'Unknown';
    debugLog('Storage check exception', debugInfo, true);
    return { 
      configured: true, 
      bucketExists: false, 
      publicUrl: null,
      debug: debugInfo,
    };
  }
}

/**
 * Generate a shareable URL for a product image
 * This can be used to embed product images on other sites
 */
export function getShareableImageUrl(url: string): {
  original: string;
  shareable: string;
  embed: string;
  markdown: string;
} {
  // For Supabase URLs, they're already public and shareable
  // For other URLs, we return them as-is
  const shareable = url;
  const embed = `<img src="${url}" alt="Product Image" />`;
  const markdown = `![Product Image](${url})`;

  debugLog('Generated shareable URLs', {
    original: url,
    shareable,
  });

  return {
    original: url,
    shareable,
    embed,
    markdown,
  };
}

/**
 * Get all images for a product as an array
 * Handles both single image and array formats
 */
export function normalizeProductImages(
  image: string | undefined,
  images: string[] | undefined
): string[] {
  const result: string[] = [];

  // First try the images array
  if (images && images.length > 0) {
    result.push(...images.filter(Boolean));
  }

  // Then try single image field
  if (image && !result.includes(image)) {
    result.push(image);
  }

  debugLog('Normalized product images', {
    inputImage: image,
    inputImages: images,
    output: result,
  });

  return result;
}

/**
 * Debug hook to log all image operations
 * Can be used in development to troubleshoot image issues
 */
export function useImageDebug() {
  return {
    logProductImage: getProductImage,
    validateUrl: validateImageUrl,
    checkStorage: checkSupabaseStorage,
    getPlaceholder: getPlaceholderImage,
    getShareable: getShareableImageUrl,
    normalize: normalizeProductImages,
  };
}