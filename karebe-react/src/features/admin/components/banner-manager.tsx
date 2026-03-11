/**
 * Banner Manager Component
 * Allows admins to upload and manage the Karebe banner image
 */

import { useState, useRef } from 'react';
import { Upload, Image, Trash2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BannerConfig {
  id: string;
  url: string;
  alt: string;
  isActive: boolean;
  uploadedAt: string;
}

export function BannerManager() {
  const [banners, setBanners] = useState<BannerConfig[]>([
    {
      id: 'default',
      url: '/banner-default.jpg',
      alt: 'Karebe Wines & Spirits',
      isActive: true,
      uploadedAt: new Date().toISOString(),
    },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<BannerConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!previewUrl) return;

    setIsUploading(true);
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newBanner: BannerConfig = {
      id: `banner-${Date.now()}`,
      url: previewUrl,
      alt: 'Karebe Banner',
      isActive: false,
      uploadedAt: new Date().toISOString(),
    };

    setBanners(prev => [...prev, newBanner]);
    setPreviewUrl(null);
    setIsUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const setActiveBanner = (id: string) => {
    setBanners(prev => prev.map(b => ({
      ...b,
      isActive: b.id === id,
    })));
  };

  const deleteBanner = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
    if (selectedBanner?.id === id) {
      setSelectedBanner(null);
    }
  };

  const activeBanner = banners.find(b => b.isActive);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Banner Management
        </CardTitle>
        <CardDescription>
          Upload and manage the hero banner image displayed on the homepage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Active Banner */}
        {activeBanner && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Current Active Banner</label>
            <div className="relative rounded-lg overflow-hidden border-2 border-green-500">
              <img
                src={activeBanner.url}
                alt={activeBanner.alt}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                ACTIVE
              </div>
            </div>
          </div>
        )}

        {/* Upload New Banner */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-gray-700">Upload New Banner</label>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="banner-upload"
            />
            <label
              htmlFor="banner-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-600">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-gray-400">
                Recommended: 1200x400px, JPG or PNG
              </span>
            </label>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Preview</label>
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {isUploading ? 'Uploading...' : 'Upload Banner'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewUrl(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Banner History */}
        {banners.length > 1 && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Banner Library</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    banner.isActive ? 'border-green-500' : 'border-gray-200 hover:border-brand-300'
                  }`}
                  onClick={() => setSelectedBanner(banner)}
                >
                  <div className="aspect-[3/1] overflow-hidden">
                    <img
                      src={banner.url}
                      alt={banner.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {banner.isActive && (
                    <div className="absolute top-1 right-1 bg-green-500 text-white p-1 rounded">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <p className="text-sm text-blue-700">
            The banner image is displayed at the top of the homepage. 
            Use high-quality images with a 3:1 aspect ratio for best results.
          </p>
        </div>
      </CardContent>

      {/* Banner Detail Dialog */}
      <Dialog
        open={!!selectedBanner}
        onClose={() => setSelectedBanner(null)}
        title="Banner Options"
        size="md"
      >
        {selectedBanner && (
          <div className="space-y-4">
            <img
              src={selectedBanner.url}
              alt={selectedBanner.alt}
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="flex gap-2">
              {!selectedBanner.isActive && (
                <Button
                  onClick={() => {
                    setActiveBanner(selectedBanner.id);
                    setSelectedBanner(null);
                  }}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Set as Active
                </Button>
              )}
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  deleteBanner(selectedBanner.id);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}
