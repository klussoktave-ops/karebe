import { useState, useEffect } from 'react';
import { ShoppingCart, Eye, Heart, Package, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProductDisplay, ProductVariant } from '../types';
import { getProductImage, validateImageUrl, normalizeProductImages } from '@/lib/image-utils';

interface ProductCardProps {
  product: ProductDisplay;
  onAddToCart?: (product: ProductDisplay, variant?: ProductVariant) => void;
  onQuickView?: (product: ProductDisplay) => void;
  layout?: 'grid' | 'list';
  showActions?: boolean;
}

/**
 * Product Card Component
 * 
 * Displays a product with image, name, price, and action buttons.
 * Supports grid and list layouts.
 * 
 * @example
 * ```tsx
 * <ProductCard 
 *   product={product} 
 *   onAddToCart={handleAddToCart}
 *   layout="grid"
 * />
 * ```
 */
export function ProductCard({
  product,
  onAddToCart,
  onQuickView,
  layout = 'grid',
  showActions = true,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.find((v) => v.isDefault) || product.variants?.[0]
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});

  // Get display price
  const displayPrice = selectedVariant?.price || product.price;
  const comparePrice = selectedVariant?.compareAtPrice || product.compareAtPrice;

  // Stock status
  const stockQuantity = selectedVariant?.stock || product.stockQuantity;
  const isOutOfStock = stockQuantity <= 0;
  const isLowStock = stockQuantity > 0 && stockQuantity <= 5;

  // Handle image URL with fallback
  useEffect(() => {
    const loadImage = async () => {
      // Normalize images - handle both old single image and new array format
      const normalizedImages = normalizeProductImages(
        'image' in product ? (product as unknown as { image?: string }).image : undefined,
        product.images
      );

      // Get best available image with fallback
      const imageResult = getProductImage(
        normalizedImages,
        product.name,
        product.categoryName,
        { width: 400, height: 400, debug: true }
      );

      setCurrentImageUrl(imageResult.url);
      setDebugInfo(imageResult.debug);

      // Validate the image URL
      const validation = await validateImageUrl(imageResult.url);
      if (!validation.valid) {
        console.warn('[ProductCard] Image validation failed:', {
          productId: product.id,
          productName: product.name,
          url: imageResult.url,
          error: validation.error,
          checks: validation.checks,
        });
        setImageError(true);
      } else {
        setImageError(false);
      }
    };

    loadImage();
  }, [product]);

  const handleAddToCart = () => {
    if (!isOutOfStock && onAddToCart) {
      onAddToCart(product, selectedVariant);
    }
  };

  const handleQuickAdd = () => {
    if (!isOutOfStock && onAddToCart) {
      onAddToCart(product, selectedVariant);
    }
  };

  const handleQuickView = () => {
    if (onQuickView) {
      onQuickView(product);
    }
  };

  // Grid layout
  if (layout === 'grid') {
    return (
      <Card
        elevation={isHovered ? 'medium' : 'low'}
        className="group relative overflow-hidden transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Debug: Log image info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-0 left-0 z-50 opacity-0 hover:opacity-100 bg-black/80 text-white text-xs p-2 max-w-[200px]">
            <div className="font-bold mb-1">Image Debug Info:</div>
            <div>Source: {debugInfo.source as string || 'unknown'}</div>
            <div>Reason: {debugInfo.reason as string || 'N/A'}</div>
            <div>Supabase: {debugInfo.supabaseStatus as string || (debugInfo.supabaseConfigured ? 'connected' : 'not configured')}</div>
            {debugInfo.solution && (
              <div className="text-yellow-300 mt-1">Fix: {debugInfo.solution as string}</div>
            )}
            <div className="text-gray-400 mt-1 truncate">
              URL: {(debugInfo.imageUrl as string || debugInfo.placeholderUrl as string)?.substring(0, 40) || 'placeholder'}...
            </div>
          </div>
        )}

        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-brand-50">
          {!imageLoaded && !imageError && (
            <Skeleton className="absolute inset-0" />
          )}
          
          {/* Error State - Show placeholder with error indicator */}
          {imageError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
              <Package className="h-12 w-12 text-gray-400 mb-2" />
              <span className="text-xs text-gray-500">Image unavailable</span>
              <span className="text-[10px] text-gray-400">Using fallback</span>
            </div>
          ) : (
            <img
              src={currentImageUrl || '/placeholder-product.png'}
              alt={product.name}
              className={`h-full w-full object-cover transition-transform duration-500 ${
                isHovered ? 'scale-110' : 'scale-100'
              } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => {
                setImageLoaded(true);
                console.log('[ProductCard] Image loaded:', { 
                  productId: product.id, 
                  url: currentImageUrl 
                });
              }}
              onError={(e) => {
                console.error('[ProductCard] Image load error:', {
                  productId: product.id,
                  productName: product.name,
                  url: currentImageUrl,
                  error: 'Image failed to load',
                });
                setImageError(true);
                // Hide broken image
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
              }}
              loading="lazy"
            />
          )}

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            {product.isNewArrival && (
              <Badge variant="info" size="sm">New</Badge>
            )}
            {product.isOnSale && comparePrice && (
              <Badge variant="danger" size="sm">
                Sale
              </Badge>
            )}
            {isOutOfStock && (
              <Badge variant="secondary" size="sm">Out of Stock</Badge>
            )}
            {isLowStock && (
              <Badge variant="warning" size="sm">Low Stock</Badge>
            )}
          </div>

          {/* Quick Actions */}
          {showActions && (
            <div
              className={`absolute right-3 top-3 flex flex-col gap-2 transition-all duration-300 ${
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
              }`}
            >
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white"
                onClick={handleQuickView}
                aria-label="Quick view"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white"
                aria-label="Add to wishlist"
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4">
          {/* Category */}
          {product.categoryName && (
            <p className="text-xs text-brand-500 mb-1">{product.categoryName}</p>
          )}

          {/* Name */}
          <h3 className="font-medium text-brand-900 line-clamp-2 mb-2 group-hover:text-brand-600 transition-colors">
            {product.name}
          </h3>

          {/* Variants */}
          {product.variants && product.variants.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    selectedVariant?.id === variant.id
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-brand-600 border-brand-200 hover:border-brand-400'
                  }`}
                  disabled={variant.stock <= 0}
                >
                  {variant.volume}
                </button>
              ))}
            </div>
          )}

          {/* Price and Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-brand-800">
                KES {displayPrice.toLocaleString()}
              </span>
              {comparePrice && comparePrice > displayPrice && (
                <span className="text-sm text-brand-400 line-through">
                  KES {comparePrice.toLocaleString()}
                </span>
              )}
            </div>

            {showActions && (
              <div className="flex items-center justify-end">
                <button
                  onClick={handleQuickAdd}
                  disabled={isOutOfStock}
                  className="relative flex-shrink-0 h-10 w-10 rounded-full bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  aria-label="Add to cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">
                    <Plus className="h-3 w-3" />
                  </span>
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // List layout
  return (
    <Card
      elevation={isHovered ? 'medium' : 'low'}
      className="group flex gap-4 p-4 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden rounded-xl bg-brand-50">
        {!imageLoaded && <Skeleton className="absolute inset-0" />}
        <img
          src={product.images[0] || '/placeholder-product.png'}
          alt={product.name}
          className={`h-full w-full object-cover transition-transform duration-500 ${
            isHovered ? 'scale-110' : 'scale-100'
          } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {product.categoryName && (
          <p className="text-xs text-brand-500 mb-1">{product.categoryName}</p>
        )}

        <h3 className="font-medium text-brand-900 mb-2 group-hover:text-brand-600 transition-colors">
          {product.name}
        </h3>

        <p className="text-sm text-brand-600 line-clamp-2 mb-3">
          {product.description}
        </p>

        {/* Variants */}
        {product.variants && product.variants.length > 1 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  selectedVariant?.id === variant.id
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-brand-600 border-brand-200 hover:border-brand-400'
                }`}
                disabled={variant.stock <= 0}
              >
                {variant.volume} - KES {variant.price.toLocaleString()}
              </button>
            ))}
          </div>
        )}

        {/* Stock info */}
        <div className="flex items-center gap-4 text-sm text-brand-500">
          <span className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            {stockQuantity} in stock
          </span>
        </div>
      </div>

      {/* Price and Actions */}
      <div className="flex flex-col items-end justify-between min-w-[120px]">
        <div className="text-right">
          <span className="text-xl font-semibold text-brand-800 block">
            KES {displayPrice.toLocaleString()}
          </span>
          {comparePrice && comparePrice > displayPrice && (
            <span className="text-sm text-brand-400 line-through">
              KES {comparePrice.toLocaleString()}
            </span>
          )}
        </div>

        {showActions && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickView}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="aspect-square p-0"
              title="Add to cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Product Card Skeleton for loading states
 */
export function ProductCardSkeleton({ layout = 'grid' }: { layout?: 'grid' | 'list' }) {
  if (layout === 'grid') {
    return (
      <Card elevation="low">
        <Skeleton className="aspect-square" />
        <CardContent className="p-4 space-y-3">
          <SkeletonText className="w-1/3 h-3" />
          <SkeletonText className="w-full h-4" />
          <SkeletonText className="w-2/3 h-4" />
          <div className="flex justify-between items-center pt-2">
            <SkeletonText className="w-1/3 h-5" />
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation="low" className="flex gap-4 p-4">
      <Skeleton className="w-32 h-32 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <SkeletonText className="w-1/4 h-3" />
        <SkeletonText className="w-3/4 h-5" />
        <SkeletonText className="w-full h-4" />
        <SkeletonText className="w-1/2 h-4" />
      </div>
      <div className="w-32 space-y-3">
        <SkeletonText className="w-full h-6" />
        <div className="flex gap-2">
          <Skeleton className="w-16 h-9 rounded-lg" />
          <Skeleton className="w-16 h-9 rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

// Helper component for skeleton text
function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={`rounded ${className}`} />;
}
