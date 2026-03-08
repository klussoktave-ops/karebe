import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, Wine } from 'lucide-react';

interface AgeVerificationContextType {
  isVerified: boolean;
  verifyAge: () => void;
  rejectAge: () => void;
}

const AgeVerificationContext = createContext<AgeVerificationContextType>({
  isVerified: false,
  verifyAge: () => {},
  rejectAge: () => {},
});

export function useAgeVerification() {
  return useContext(AgeVerificationContext);
}

const AGE_VERIFICATION_KEY = 'karebe_age_verified';
const MINIMUM_AGE = 18;

export function AgeVerificationProvider({ children }: { children: ReactNode }) {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check if user has already verified their age
    const verified = localStorage.getItem(AGE_VERIFICATION_KEY);
    if (verified === 'true') {
      setIsVerified(true);
    } else {
      // Show modal after a short delay to let the page load
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const verifyAge = () => {
    localStorage.setItem(AGE_VERIFICATION_KEY, 'true');
    setIsVerified(true);
    setIsOpen(false);
  };

  const rejectAge = () => {
    // Store rejection to show message on next visit
    localStorage.setItem(AGE_VERIFICATION_KEY, 'rejected');
    setIsOpen(false);
  };

  const handleClose = () => {
    // Don't close on overlay click - require explicit action
    // Only close if user has verified or rejected
  };

  return (
    <AgeVerificationContext.Provider value={{ isVerified, verifyAge, rejectAge }}>
      {children}
      
      <Dialog
        open={isOpen}
        onClose={handleClose}
        hideCloseButton={true}
        size="sm"
      >
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-brand-100 p-4 rounded-full">
              <Wine className="w-12 h-12 text-brand-600" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold">
            Age Verification Required
          </DialogTitle>
          <DialogDescription className="text-base">
            Karebe Wines & Spirits sells alcohol products and requires age verification.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              You must be at least {MINIMUM_AGE} years old to purchase alcohol in Kenya. 
              By proceeding, you confirm that you are of legal drinking age.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={rejectAge}
            className="flex-1"
          >
            I am under {MINIMUM_AGE}
          </Button>
          <Button
            onClick={verifyAge}
            className="flex-1 bg-brand-600 hover:bg-brand-700"
          >
            I am {MINIMUM_AGE}+
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          This verification is required by Kenyan alcohol laws. 
          Age verification data is stored locally on your device.
        </p>
      </Dialog>
    </AgeVerificationContext.Provider>
  );
}

export default AgeVerificationProvider;
