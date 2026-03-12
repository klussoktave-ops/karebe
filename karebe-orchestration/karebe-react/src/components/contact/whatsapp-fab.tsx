import { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/features/cart/hooks/use-cart';
import { getWhatsAppNumber } from '@/features/settings/hooks/use-settings';
import { useShowPrices } from '@/features/settings/hooks/use-settings';

interface WhatsAppQuickOrderFabProps {
  position?: 'bottom-right' | 'bottom-left';
}

export function WhatsAppQuickOrderFab({ 
  position = 'bottom-right' 
}: WhatsAppQuickOrderFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { items } = useCart();
  const whatsappNumber = getWhatsAppNumber();

  // Calculate totals using configurable pricing (matching cart-summary)
  const [pricingConfig] = useState({
    vatRate: 0.16,
    baseDeliveryFee: 300,
    freeDeliveryThreshold: 5000,
  });

  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * pricingConfig.vatRate;
  const isFreeDelivery = subtotal >= pricingConfig.freeDeliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0 : pricingConfig.baseDeliveryFee;
  const total = subtotal + tax + deliveryFee;
  
  // Check if prices should be shown
  const showPrices = useShowPrices();

  // Generate pre-filled WhatsApp message with cart contents
  const generateCartMessage = () => {
    if (items.length === 0) {
      return '';
    }

    let msg = 'Hello Karebe! I would like to order:\n\n';
    
    items.forEach((item) => {
      msg += `• ${item.product.name} x${item.quantity} - KSh ${(item.unitPrice * item.quantity).toLocaleString()}\n`;
    });

    msg += `\nSubtotal: KSh ${subtotal.toLocaleString()}\n`;
    msg += `Delivery: KSh ${deliveryFee.toLocaleString()}${isFreeDelivery ? ' (FREE)' : ''}\n`;
    msg += `*Total: KSh ${total.toLocaleString()}*\n\n`;
    msg += 'Please confirm availability and delivery details.';

    return msg;
  };

  const handleOpen = () => {
    // Auto-populate with cart if available
    if (items.length > 0 && !message) {
      setMessage(generateCartMessage());
    }
    setIsOpen(true);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    setIsSending(true);

    // Encode message for WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');

    setIsSending(false);
    setIsOpen(false);
    
    // Clear message after sending
    setTimeout(() => {
      setMessage('');
    }, 1000);
  };

  // Handle keyboard shortcut (Ctrl+Shift+W)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        handleOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, message]);

  return (
    <>
      {/* Floating Action Button */}
      <div
        className={`fixed z-50 ${
          position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'
        }`}
      >
        {/* Chat Panel */}
        {isOpen && (
          <Card className="absolute bottom-16 w-80 md:w-96 shadow-xl animate-in slide-in-from-bottom-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  Quick Order via WhatsApp
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Cart Summary */}
              {items.length > 0 && (
                <div className="bg-green-50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-green-800">
                    {items.length} item{items.length !== 1 ? 's' : ''} in cart
                  </p>
                  {showPrices ? (
                    <p className="text-green-700">
                      Total: KSh {total.toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-green-700 italic">
                      Contact for pricing
                    </p>
                  )}
                </div>
              )}

              {/* Message Input */}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your order message..."
                className="min-h-[100px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

              {/* Quick Templates */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage('Hello! I would like to place an order. Please share your available products.')}
                  className="text-xs"
                >
                  Browse Products
                </Button>
                {items.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage(generateCartMessage())}
                    className="text-xs"
                  >
                    Include Cart
                  </Button>
                )}
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send via WhatsApp
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Opens WhatsApp with your pre-filled message
              </p>
            </CardContent>
          </Card>
        )}

        {/* FAB Button */}
        <Button
          onClick={handleOpen}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg bg-green-500 hover:bg-green-600 transition-transform hover:scale-110"
          aria-label="Quick Order via WhatsApp"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </Button>
      </div>
    </>
  );
}

export default WhatsAppQuickOrderFab;
