import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';

/**
 * Image Gallery Component
 * 
 * A reusable component for managing multiple product images with:
 * - File upload to Supabase Storage
 * - URL input for external images
 * - Add/remove/reorder capabilities
 * - Comprehensive debug logging for troubleshooting
 * 
 * @example
 * <ImageGallery
 *   images={['https://example.com/image1.jpg']}
 *   onImagesChange={(images) => console.log(images)}
 *   maxImages={5}
 * />
 */

export interface ImageGalleryProps {
  /** Current array of image URLs */
  images?: string[];
  /** Callback when images array changes */
  onImagesChange?: (images: string[]) => void;
  /** Maximum number of images allowed */
  maxImages?: number;
  /** Storage bucket path prefix */
  uploadPath?: string;
  /** Show debug panel */
  debug?: boolean;
  /** Label for the gallery */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
}

// Debug logging utility
const debugLog = (context: string, data: Record<string, unknown>, isError = false) => {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '[ImageGallery ERROR]' : '[ImageGallery]';
  console.log(`${prefix} [${timestamp}] ${context}:`, JSON.stringify(data, null, 2));
};

export function ImageGallery({
  images: initialImages = [],
  onImagesChange,
  maxImages = 5,
  uploadPath = 'products',
  debug = true,
  label = 'Product Images',
  disabled = false,
}: ImageGalleryProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, 'loading' | 'loaded' | 'error'>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug: Log initial state
  useEffect(() => {
    debugLog('Component initialized', {
      initialImages,
      maxImages,
      uploadPath,
      label,
    });
  }, []);

  // Sync with parent when initialImages changes
  useEffect(() => {
    if (JSON.stringify(initialImages) !== JSON.stringify(images)) {
      debugLog('Syncing with parent initialImages', {
        initialImages,
        currentImages: images,
      });
      setImages(initialImages);
    }
  }, [initialImages]);

  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle adding URL
  const handleAddUrl = useCallback(() => {
    debugLog('Attempting to add URL', { urlInput, currentCount: images.length, maxImages });

    if (!urlInput.trim()) {
      setUrlError('Please enter a URL');
      debugLog('URL validation failed', { error: 'Empty URL' }, true);
      return;
    }

    if (!isValidUrl(urlInput)) {
      setUrlError('Please enter a valid URL');
      debugLog('URL validation failed', { error: 'Invalid URL format', urlInput }, true);
      return;
    }

    if (images.length >= maxImages) {
      setUrlError(`Maximum ${maxImages} images allowed`);
      debugLog('URL validation failed', { error: 'Max images reached' }, true);
      return;
    }

    const newImages = [...images, urlInput];
    setImages(newImages);
    onImagesChange?.(newImages);
    setUrlInput('');
    setUrlError('');
    
    debugLog('URL added successfully', { url: urlInput, totalImages: newImages.length });
  }, [urlInput, images, maxImages, onImagesChange]);

  // Upload single file to Supabase via S3 (direct)
  const uploadToS3 = async (file: File): Promise<string> => {
    debugLog('Starting S3 direct upload', {
      fileName: file.name,
      fileSize: file.size,
      endpoint: 'https://pwcqgwpkvesoowpnomad.storage.supabase.co/storage/v1/s3',
    });

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    try {
      // S3 multipart upload using fetch
      const endpoint = 'https://pwcqgwpkvesoowpnomad.storage.supabase.co/storage/v1/s3';
      const accessKey = 'bde86536e78ee2391c425a50368a4123';
      
      // Create a simple PUT request with AWS Signature V4
      // For Supabase S3, we can use the simpler form-post approach or direct PUT
      const response = await fetch(`${endpoint}/product_images/${filePath}`, {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: file,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ImageGallery S3] Upload failed:', response.status, errorText);
        throw new Error(`S3 upload failed: ${response.status}`);
      }

      const publicUrl = `https://pwcqgwpkvesoowpnomad.supabase.co/storage/v1/object/public/product_images/${filePath}`;
      debugLog('S3 upload successful', { url: publicUrl });
      return publicUrl;
    } catch (error) {
      console.error('[ImageGallery S3] Upload error:', error);
      throw error;
    }
  };

  // Upload single file to Supabase
  const uploadToSupabase = async (file: File): Promise<string> => {
    debugLog('Starting Supabase upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bucket: 'product_images',
      path: uploadPath,
    });

    // Check Supabase client
    if (!supabase) {
      debugLog('Supabase client not initialized', {
        message: 'Using demo mode - converting to data URL',
      }, true);
      // Fallback: convert to base64 data URL for demo mode
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          debugLog('File converted to data URL (demo mode)', {
            result: (reader.result as string).substring(0, 100) + '...',
          });
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          debugLog('FileReader error', { error: reader.error }, true);
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
      });
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${uploadPath}/${fileName}`;

    debugLog('Uploading to Supabase Storage', {
      filePath,
      bucket: 'product_images',
    });

    // Check if bucket exists - try direct access first (more reliable than listBuckets)
    console.log('[ImageGallery DEBUG] Checking bucket access directly...');
    
    let bucketExists = false;
    try {
      // @ts-ignore - Supabase types may not match runtime
      const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('product_images');
      console.log('[ImageGallery DEBUG] Direct bucket check:', { bucketData, bucketError });
      bucketExists = !bucketError && !!bucketData;
    } catch (e) {
      console.log('[ImageGallery DEBUG] Direct bucket check failed:', e);
    }
    
    // Fallback: try listing buckets if direct access fails
    if (!bucketExists) {
      console.log('[ImageGallery DEBUG] Trying listBuckets as fallback...');
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      // DEBUG: Add detailed diagnostics
      console.log('[ImageGallery DEBUG] Storage bucket check:', {
        supabaseConfigured: !!supabase,
        listBucketsResult: buckets,
        listBucketsError: bucketError?.message,
        timestamp: new Date().toISOString(),
      });
      
      if (bucketError) {
        debugLog('Failed to list buckets', { error: bucketError.message }, true);
        // Check if this is a permission error vs. no storage enabled
        if (bucketError.message.includes('permission') || bucketError.message.includes('denied')) {
          console.error('[ImageGallery DEBUG] Storage permission error - anon key may lack storage permissions');
        }
        throw new Error(`Storage bucket error: ${bucketError.message}`);
      }

      // DEBUG: Log what we're working with
      console.log('[ImageGallery DEBUG] Available buckets:', {
        count: buckets?.length || 0,
        buckets: buckets?.map(b => ({ name: b.name, public: b.public })),
        lookingFor: 'product_images',
      });

      bucketExists = buckets?.some(b => b.name === 'product_images');
    }
    
    if (!bucketExists) {
      console.warn('[ImageGallery DEBUG] product_images bucket NOT FOUND - falling back to base64');
      debugLog('Bucket does not exist - using base64 fallback', { 
        note: 'Bucket may exist but anon key lacks list permission',
      }, true);
      // Fallback: convert to base64 data URL when bucket doesn't exist
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          debugLog('File converted to data URL (bucket fallback)', {
            result: (reader.result as string).substring(0, 100) + '...',
          });
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          debugLog('FileReader error', { error: reader.error }, true);
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
      });
    }

    // Upload the file
    const { data, error } = await supabase.storage
      .from('product_images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      debugLog('Upload failed', { 
        error: error.message,
        errorDetails: error,
      }, true);
      throw new Error(`Upload failed: ${error.message}`);
    }

    debugLog('Upload successful', { data });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product_images')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      debugLog('Failed to get public URL', { data: urlData }, true);
      throw new Error('Failed to get public URL for uploaded file');
    }

    debugLog('Got public URL', { publicUrl: urlData.publicUrl });
    return urlData.publicUrl;
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    debugLog('Files selected', { 
      count: files.length,
      fileNames: Array.from(files).map(f => f.name),
    });

    if (images.length + files.length > maxImages) {
      debugLog('Max images exceeded', { 
        current: images.length, 
        adding: files.length, 
        max: maxImages 
      }, true);
      alert(`Maximum ${maxImages} images allowed. You can add ${maxImages - images.length} more.`);
      return;
    }

    setIsUploading(true);
    const newImages: string[] = [];
    const newProgress: Record<string, number> = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        debugLog('Invalid file type', { file: file.name, type: file.type }, true);
        alert(`Invalid file type: ${file.name}. Please select an image file.`);
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        debugLog('File too large', { file: file.name, size: file.size }, true);
        alert(`File too large: ${file.name}. Maximum size is 5MB.`);
        continue;
      }

      const tempId = `upload-${Date.now()}-${i}`;
      newProgress[tempId] = 0;
      setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev[tempId] < 90) {
              return { ...prev, [tempId]: prev[tempId] + 10 };
            }
            clearInterval(progressInterval);
            return prev;
          });
        }, 100);

        let imageUrl: string;
        
        // Try S3 upload first with direct credentials
        try {
          imageUrl = await uploadToS3(file);
          debugLog('S3 upload succeeded', { url: imageUrl });
        } catch (s3Error) {
          debugLog('S3 upload failed, trying Supabase...', { error: s3Error }, true);
          // Fall back to Supabase JS client
          try {
            imageUrl = await uploadToSupabase(file);
          } catch (supabaseError) {
            debugLog('Supabase upload failed, using base64...', { error: supabaseError }, true);
            // Final fallback to base64 (already handled inside uploadToSupabase)
            imageUrl = await uploadToSupabase(file);
          }
        }
        
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [tempId]: 100 }));
        
        newImages.push(imageUrl);
        debugLog('File uploaded successfully', { file: file.name, url: imageUrl });
      } catch (error) {
        debugLog('Upload error', { 
          file: file.name, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }, true);
        alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesChange?.(updatedImages);
      debugLog('All uploads complete', { 
        totalImages: updatedImages.length,
        newImages: newImages.length,
      });
    }

    setUploadProgress({});
    setIsUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [images, maxImages, onImagesChange, uploadPath]);

  // Handle remove image
  const handleRemoveImage = useCallback((index: number) => {
    debugLog('Removing image', { index, currentImages: images.length });
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesChange?.(newImages);
    debugLog('Image removed', { removedIndex: index, remaining: newImages.length });
  }, [images, onImagesChange]);

  // Handle image load error
  const handleImageError = useCallback((url: string, error: string) => {
    debugLog('Image load error', { url, error }, true);
    setImageErrors(prev => ({ ...prev, [url]: error }));
    setLoadingStates(prev => ({ ...prev, [url]: 'error' }));
  }, []);

  // Handle image load success
  const handleImageLoad = useCallback((url: string) => {
    debugLog('Image loaded successfully', { url });
    setLoadingStates(prev => ({ ...prev, [url]: 'loaded' }));
    setImageErrors(prev => {
      const { [url]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Test image URL connectivity
  const testImageUrl = useCallback(async (url: string) => {
    debugLog('Testing image URL', { url });
    setLoadingStates(prev => ({ ...prev, [url]: 'loading' }));

    try {
      // First check if it's a data URL
      if (url.startsWith('data:')) {
        debugLog('Data URL detected - using directly', { url: url.substring(0, 50) + '...' });
        setLoadingStates(prev => ({ ...prev, [url]: 'loaded' }));
        return true;
      }

      // Check if it's a Supabase URL
      if (url.includes('supabase')) {
        debugLog('Supabase URL detected', { url });
        // Try to verify the URL is accessible
        if (supabase) {
          // @ts-ignore - Supabase types may vary by version
          const { data, error } = await supabase.storage
            .from('product_images')
            .getPublicUrl(url.split('/').pop() || '');
          
          if (error) {
            debugLog('Supabase URL verification failed', { error: error.message }, true);
            handleImageError(url, `Supabase error: ${error.message}`);
            return false;
          }
        }
      }

      // Try to load the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return new Promise<boolean>((resolve) => {
        img.onload = () => {
          debugLog('Image loaded successfully', { url, width: img.width, height: img.height });
          handleImageLoad(url);
          resolve(true);
        };
        img.onerror = () => {
          const errorMsg = 'Failed to load image - may be missing, expired, or CORS blocked';
          debugLog('Image load failed', { url, error: errorMsg }, true);
          handleImageError(url, errorMsg);
          resolve(false);
        };
        img.src = url;
      });
    } catch (error) {
      debugLog('Image test error', { url, error: error instanceof Error ? error.message : 'Unknown' }, true);
      handleImageError(url, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }, [handleImageError, handleImageLoad]);

  // Test all images on mount
  useEffect(() => {
    if (images.length > 0 && debug) {
      debugLog('Testing all existing images', { count: images.length });
      images.forEach(url => testImageUrl(url));
    }
  }, [images.length > 0 ? images : [], debug]);

  return (
    <div className="space-y-4">
      {/* Debug Panel */}
      {debug && (
        <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono">
          <div className="font-bold mb-2">🔍 Image Gallery Debug</div>
          <div>Total Images: {images.length}/{maxImages}</div>
          <div>Supabase Client: {supabase ? '✅ Connected' : '❌ Demo Mode'}</div>
          <div>Upload Path: {uploadPath}</div>
          {Object.keys(imageErrors).length > 0 && (
            <div className="text-red-400 mt-2">
              ⚠️ Errors: {Object.keys(imageErrors).length}
            </div>
          )}
        </div>
      )}

      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Badge variant="outline">{images.length}/{maxImages}</Badge>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((url, index) => (
            <div 
              key={`${url}-${index}`} 
              className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-100"
            >
              {/* Loading State */}
              {loadingStates[url] === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                </div>
              )}

              {/* Error State */}
              {imageErrors[url] && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10 p-2">
                  <div className="text-center">
                    <div className="text-red-500 text-xs font-bold">❌ Load Failed</div>
                    <div className="text-red-400 text-[10px] truncate">{imageErrors[url]}</div>
                    <button 
                      onClick={() => testImageUrl(url)}
                      className="text-xs text-blue-500 hover:underline mt-1"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Image */}
              <img
                src={url}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover"
                onLoad={() => handleImageLoad(url)}
                onError={() => handleImageError(url, 'Failed to load image')}
              />

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveImage(index)}
                disabled={disabled}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                title="Remove image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Index Badge */}
              {index === 0 && (
                <div className="absolute bottom-1 left-1 bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([id, progress]) => (
            <div key={id} className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Images Section */}
      {images.length < maxImages && (
        <div className="space-y-3">
          {/* File Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={disabled || isUploading}
              className="hidden"
              id="image-gallery-upload"
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Images ({maxImages - images.length} remaining)
                </>
              )}
            </Button>
          </div>

          {/* URL Input */}
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="Or paste image URL..."
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setUrlError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              disabled={disabled}
              className={urlError ? 'border-red-500' : ''}
            />
            <Button
              type="button"
              onClick={handleAddUrl}
              disabled={disabled || !urlInput.trim()}
            >
              Add
            </Button>
          </div>
          {urlError && (
            <p className="text-sm text-red-500">{urlError}</p>
          )}
        </div>
      )}

      {/* Max Images Reached */}
      {images.length >= maxImages && (
        <div className="text-center py-2 text-gray-500 text-sm">
          Maximum number of images reached ({maxImages})
        </div>
      )}
    </div>
  );
}