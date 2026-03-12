import { useState } from 'react';
import { MapPin, ExternalLink, Loader2 } from 'lucide-react';
import type { Branch } from '@/features/branches/stores/branch-store';

interface GoogleMapsEmbedProps {
  branch: Branch;
  height?: number;
  zoom?: number;
}

export function GoogleMapsEmbed({ 
  branch, 
  height = 300,
  zoom = 15 
}: GoogleMapsEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate Google Maps embed URL
  const embedUrl = branch.lat && branch.lng
    ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${branch.lat},${branch.lng}&zoom=${zoom}`
    : `https://www.google.com/maps/embed/v1/search?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(branch.location)}&zoom=${zoom}`;

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Open in Google Maps
  const openInMaps = () => {
    const mapsUrl = branch.lat && branch.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.location)}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-100">
      {/* Loading State */}
      {isLoading && !hasError && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10"
          style={{ height }}
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div 
          className="flex flex-col items-center justify-center bg-gray-100"
          style={{ height }}
        >
          <MapPin className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">{branch.name}</p>
          <p className="text-sm text-gray-500 text-center px-4">{branch.location}</p>
          <button
            onClick={openInMaps}
            className="mt-3 text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            Get Directions
          </button>
        </div>
      )}

      {/* Map Iframe */}
      {!hasError && branch.lat && branch.lng && (
        <iframe
          src={embedUrl}
          width="100%"
          height={height}
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of ${branch.name}`}
          onLoad={handleLoad}
          onError={handleError}
          className={isLoading ? 'opacity-0' : 'opacity-100'}
        />
      )}

      {/* Fallback for branches without coordinates */}
      {!hasError && (!branch.lat || !branch.lng) && (
        <div 
          className="flex flex-col items-center justify-center"
          style={{ height }}
        >
          <MapPin className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">{branch.name}</p>
          <p className="text-sm text-gray-500 text-center px-4">{branch.location}</p>
          <button
            onClick={openInMaps}
            className="mt-3 text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            View on Google Maps
          </button>
        </div>
      )}

      {/* Branch Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-8">
        <div className="text-white">
          <p className="font-semibold text-sm">{branch.name}</p>
          <p className="text-xs text-white/80">{branch.location}</p>
        </div>
      </div>
    </div>
  );
}

// Component for displaying multiple branches with maps
interface BranchMapsProps {
  branches: Branch[];
}

export function BranchMaps({ branches }: BranchMapsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {branches.map((branch) => (
        <GoogleMapsEmbed key={branch.id} branch={branch} />
      ))}
    </div>
  );
}

export default GoogleMapsEmbed;
