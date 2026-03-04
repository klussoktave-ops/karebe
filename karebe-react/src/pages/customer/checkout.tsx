import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Phone, User, Truck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { MpesaPaymentSection } from '@/features/checkout/components/mpesa-payment-section';
import { useCartStore } from '@/features/cart/stores/cart-store';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotal } = useCartStore();
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    deliveryNotes: '',
  });

  const subtotal = getTotal();
  const deliveryFee = 200;
  const total = subtotal + deliveryFee;

  const handlePaymentComplete = (mpesaCode: string) => {
    // Submit order with payment confirmation
    console.log('Order submitted with M-Pesa code:', mpesaCode);
    navigate('/order-confirmation');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-4">Add items to your cart before checking out</p>
            <Button onClick={() => navigate('/')}>
              Browse Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/cart')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Checkout</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center gap-2 ${step === 'details' ? 'text-brand-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'details' ? 'bg-brand-600 text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="font-medium">Details</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-200 mx-4" />
          <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-brand-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'payment' ? 'bg-brand-600 text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="font-medium">Payment</span>
          </div>
        </div>

        {step === 'details' ? (
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">KES {(item.unitPrice * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>KES {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span>KES {deliveryFee.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">KES {total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Delivery Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <Input
                    placeholder="Enter your full name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      className="pl-10"
                      placeholder="e.g., 0712345678"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    We'll use this for delivery updates
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Delivery Address
                  </label>
                  <Input
                    placeholder="Enter your delivery address"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Delivery Notes (Optional)
                  </label>
                  <Input
                    placeholder="e.g., Call when you arrive"
                    value={customerInfo.deliveryNotes}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, deliveryNotes: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={() => setStep('payment')}
              disabled={!customerInfo.name || !customerInfo.phone || !customerInfo.address}
            >
              Continue to Payment
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment Section */}
            <MpesaPaymentSection
              amount={total}
              orderId="ORDER-001"
              onPaymentComplete={handlePaymentComplete}
            />

            {/* Alternative Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Other Payment Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/cart')}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Cart
                </Button>
                <p className="text-sm text-gray-500 text-center">
                  Need help?{' '}
                  <a href="tel:+254712345678" className="text-brand-600 font-medium">
                    Call us
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
