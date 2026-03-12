/**
 * Floating Action Buttons
 * Mobile-friendly floating buttons for Call, WhatsApp, and Cart
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, ShoppingCart, User, Plus, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CallButton } from '@/features/orders/components/CallButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useCartStore } from '@/features/cart/stores/cart-store';
import { useSettings, getSupportPhone, getWhatsAppNumber } from '@/features/settings/hooks/use-settings';

// Railway API URL for pricing
const ORCHESTRATION_API = import.meta.env.VITE_ORCHESTRATION_API_URL || 'https://karebe-orchestration-production.up.railway.app';

// Default values
const DEFAULT_BASE_FEE = 300;
const DEFAULT_FREE_THRESHOLD = 5000;

export interface FloatingActionsProps {
  /** Number of items in cart */
  cartItemCount?: number;
  /** Callback when cart is clicked */
  onCartClick?: () => void;
  /** Phone number for calls */
  phoneNumber?: string;
  /** WhatsApp number */
  whatsappNumber?: string;
  /** Whether user is logged in */
  isLoggedIn?: boolean;
  /** User role */
  userRole?: string;
  /** Callback for admin click */
  onAdminClick?: () => void;
  /** Callback for rider click */
  onRiderClick?: () => void;
  /** Callback for login click */
  onLoginClick?: () => void;
  /** Additional classes */
  className?: string;
}

const STORE_PHONE = '+254720123456';
const STORE_WHATSAPP = '+254720123456';

export function FloatingActions({
  cartItemCount = 0,
  onCartClick: _onCartClick,
  phoneNumber: _phoneNumber,
  whatsappNumber: _whatsappNumber,
  isLoggedIn: _isLoggedIn,
  userRole,
  onAdminClick,
  onRiderClick,
  onLoginClick: _onLoginClick,
  className,
}: FloatingActionsProps) {
  const { settings } = useSettings();
  const phoneNumber = _phoneNumber || getSupportPhone();
  const whatsappNumber = _whatsappNumber || getWhatsAppNumber();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const { items, subtotal, deliveryFee, getTotal } = useCartStore();
  
  // Fetch pricing config for threshold
  const [freeThreshold, setFreeThreshold] = useState(DEFAULT_FREE_THRESHOLD);
  
  useEffect(() => {
    fetch(`${ORCHESTRATION_API}/api/pricing`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.data?.settings) {
          const settings = data.data.settings;
          setFreeThreshold(settings.free_delivery_threshold?.amount ?? DEFAULT_FREE_THRESHOLD);
        }
      })
      .catch(console.error);
  }, []);
  
  // Detect when user scrolls near the bottom (cart section)
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const pageHeight = document.documentElement.scrollHeight;
      // Show FAB when within 400px of bottom (cart section)
      const threshold = pageHeight - 400;
      setIsNearBottom(scrollPosition > threshold);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const formatCartMessage = () => {
    if (items.length === 0) return '';
    
    const itemsList = items
      .map(item => `- ${item.product.name}${item.variant ? ` (${item.variant.volume})` : ''} x${item.quantity} @ KES ${item.unitPrice}`)
      .join('\n');
    
    const total = getTotal();
    const delivery = deliveryFee > 0 ? `KES ${deliveryFee.toLocaleString()}` : 'Free';
    
    return `Hello! I would like to order:\n${itemsList}\n\nSubtotal: KES ${subtotal.toLocaleString()}\nDelivery: ${delivery}${subtotal > freeThreshold ? ' (Free over KES ' + freeThreshold + ')' : ''}\nTotal: KES ${total.toLocaleString()}\n\nPlease confirm availability and delivery details.`;
  };

  const handleWhatsAppShare = () => {
    const message = formatCartMessage();
    const encodedMessage = encodeURIComponent(message);
    const waNumber = whatsappNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${waNumber}?text=${encodedMessage}`, '_blank');
    setShowShareDialog(false);
  };

  const handleSmsShare = () => {
    const message = formatCartMessage();
    const smsBody = encodeURIComponent(message);
    window.location.href = `sms:${phoneNumber}?body=${smsBody}`;
    setShowShareDialog(false);
  };

  const handleCopyToClipboard = async () => {
    const message = formatCartMessage();
    try {
      await navigator.clipboard.writeText(message);
      alert('Order copied to clipboard! You can paste it in WhatsApp or any messaging app.');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    setShowShareDialog(false);
  };

  const handleWhatsAppInquiry = () => {
    const message = encodeURIComponent('Hi Karebe! I would like to inquire about your products.');
    window.open(`https://wa.me/${whatsappNumber.replace('+', '')}?text=${message}`, '_blank');
  };

  return (
    <>
      <div className={cn('fixed bottom-4 right-4 z-40 flex flex-col gap-2', className, isNearBottom && 'opacity-0 pointer-events-none transition-opacity duration-300')}>
        {/* User/Admin Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-gray-800 hover:bg-gray-900"
            >
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2">
            {(userRole === 'super-admin' || userRole === 'admin') && (
              <DropdownMenuItem onClick={onAdminClick}>
                Admin Dashboard
              </DropdownMenuItem>
            )}
            {userRole === 'rider' && (
              <DropdownMenuItem onClick={onRiderClick}>
                Rider Portal
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => window.location.href = `tel:${phoneNumber}`}>
              <Phone className="h-4 w-4 mr-2" />
              Call Us
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleWhatsAppInquiry}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Cart Button with Share - Always Visible */}
        {cartItemCount > 0 ? (
          <>
            {/* Share Cart Button */}
            <Button
              onClick={() => setShowShareDialog(true)}
              className="h-12 px-4 rounded-full shadow-lg bg-green-600 hover:bg-green-700 flex items-center gap-2"
              title="Share cart via WhatsApp or SMS"
            >
              <Send className="h-5 w-5" />
              <span className="font-medium">Text Order</span>
            </Button>
            
            {/* View Cart Button */}
            <Link to="/cart">
              <Button
                className="h-12 px-4 rounded-full shadow-lg bg-brand-600 hover:bg-brand-700 flex items-center gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="font-medium">View Cart ({cartItemCount})</span>
              </Button>
            </Link>
          </>
        ) : (
          /* Add to Cart Button - Always visible */
          <Link to="/">
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-brand-600 hover:bg-brand-700"
              title="Browse products"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </Link>
        )}

        {/* Call to Order Button */}
        <div className="h-auto">
          <CallButton
            phoneNumber={phoneNumber}
            className="h-14 px-6 rounded-full shadow-lg flex items-center justify-center whitespace-nowrap"
          />
        </div>
      </div>

      {/* Share Cart Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Order</DialogTitle>
            <DialogDescription>
              Send your order to Karebe via WhatsApp or SMS. You can also copy it to share anywhere.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {/* Preview of message */}
            <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-500 mb-2">Message preview:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{formatCartMessage()}</p>
            </div>
            
            {/* Share options */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleWhatsAppShare}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </Button>
              
              <Button
                onClick={handleSmsShare}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white gap-2"
              >
                <MessageSquare className="h-5 w-5" />
                SMS
              </Button>
            </div>
            
            <Button
              onClick={handleCopyToClipboard}
              variant="outline"
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              Copy to Clipboard
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FloatingActions;
