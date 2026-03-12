/**
 * Location Display Component
 * Shows current branch/location with ability to change
 */

import { useState } from 'react';
import { MapPin, ChevronDown, Navigation, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBranchStore } from '../stores/branch-store';

interface Branch {
  id: string;
  name: string;
  address: string;
  distance?: string;
  isOpen: boolean;
  phone: string;
}

const MOCK_BRANCHES: Branch[] = [
  {
    id: 'kilimani',
    name: 'Karebe Kilimani',
    address: '123 Kilimani Road, Nairobi',
    distance: '2.3 km away',
    isOpen: true,
    phone: '+254712345678',
  },
  {
    id: 'westlands',
    name: 'Karebe Westlands',
    address: '45 Westlands Road, Nairobi',
    distance: '5.1 km away',
    isOpen: true,
    phone: '+254723456789',
  },
  {
    id: 'cbd',
    name: 'Karebe CBD',
    address: '789 Kenyatta Avenue, Nairobi',
    distance: '0.8 km away',
    isOpen: false,
    phone: '+254734567890',
  },
];

export function LocationDisplay() {
  const { selectedBranch, setSelectedBranch } = useBranchStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Mock reverse geocoding
          setUserLocation('Current Location');
          // Find nearest branch
          const nearest = MOCK_BRANCHES[0];
          setSelectedBranch({
            id: nearest.id,
            name: nearest.name,
            location: nearest.address,
            phone: nearest.phone,
            isMain: false,
          });
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  };

  const handleSelectBranch = (branch: Branch) => {
    setSelectedBranch({
      id: branch.id,
      name: branch.name,
      location: branch.address,
      phone: branch.phone,
      isMain: false,
    });
    setIsDialogOpen(false);
  };

  return (
    <>
      {/* Location Bar */}
      <Button
        variant="outline"
        className="w-full justify-between h-auto py-3 px-4 bg-white hover:bg-gray-50"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-100 rounded-full">
            <MapPin className="h-4 w-4 text-brand-600" />
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-500">Delivering to</p>
            <p className="font-medium text-gray-900">
              {selectedBranch?.name || 'Select Location'}
            </p>
            {selectedBranch && (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                {selectedBranch.location}
              </p>
            )}
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </Button>

      {/* Location Selection Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Select Delivery Location"
        size="md"
      >
        <div className="space-y-4">
          {/* Detect Location Button */}
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleDetectLocation}
          >
            <Navigation className="h-4 w-4 text-brand-600" />
            Use Current Location
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or select a branch</span>
            </div>
          </div>

          {/* Branch List */}
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {MOCK_BRANCHES.map((branch) => (
              <Card
                key={branch.id}
                className={`cursor-pointer transition-all ${
                  selectedBranch?.id === branch.id
                    ? 'border-2 border-brand-500 bg-brand-50'
                    : 'hover:border-gray-300'
                }`}
                onClick={() => handleSelectBranch(branch)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <Store className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{branch.name}</h3>
                          {selectedBranch?.id === branch.id && (
                            <Badge className="bg-brand-600 text-white text-xs">Selected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{branch.address}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">{branch.distance}</span>
                          <Badge
                            variant={branch.isOpen ? 'default' : 'secondary'}
                            className={branch.isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                          >
                            {branch.isOpen ? 'Open' : 'Closed'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info */}
          <p className="text-xs text-gray-500 text-center">
            Selecting a location helps us show accurate pricing and delivery times
          </p>
        </div>
      </Dialog>
    </>
  );
}
