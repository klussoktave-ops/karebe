import { useState } from 'react';
import { Copy, Check, AlertCircle, Timer, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BranchMpesaManager } from '@/features/admin/services/branch-mpesa-manager';
import { MpesaService } from '@/features/payments/services/mpesa-service';
import { MpesaIcon } from '@/components/ui/mpesa-icon';

interface MpesaPaymentSectionProps {
  amount: number;
  orderId: string;
  branchId?: string;
  paymentType?: 'buy_goods' | 'stk_push' | 'both';
  tillNumber?: string;
  onPaymentComplete?: (mpesaCode: string) => void;
}

export function MpesaPaymentSection({
  amount,
  orderId,
  branchId,
  paymentType = 'buy_goods',
  tillNumber: propTillNumber,
  onPaymentComplete,
}: MpesaPaymentSectionProps) {
  const [copied, setCopied] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [timeRemaining] = useState(30); // 30 min timeout
  const [manualCode, setManualCode] = useState('');

  // Get M-Pesa config for branch - use prop or fallback to default
  // Default should match checkout.tsx DEFAULT_TILL_NUMBER = '9137883'
  const mpesaManager = new BranchMpesaManager();
  const DEFAULT_TILL_NUMBER = '9137883';
  const [localTillNumber] = useState(propTillNumber || DEFAULT_TILL_NUMBER);
  const tillNumber = propTillNumber || localTillNumber || DEFAULT_TILL_NUMBER;
  const formattedTill = tillNumber.replace(/(\d{3})(\d{3})/, '$1 $2');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tillNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = paymentType === 'stk_push' ? [
    { num: 1, text: 'Open M-Pesa on your phone', icon: '📱' },
    { num: 2, text: 'Select "Lipa na M-Pesa"', icon: '💳' },
    { num: 3, text: 'Select "Pay Bill"', icon: '📝' },
    { num: 4, text: `Enter Business Number: ${formattedTill}`, icon: '🔢', highlight: true },
    { num: 5, text: `Enter Amount: KES ${amount.toLocaleString()}`, icon: '💰' },
    { num: 6, text: 'Enter your M-Pesa PIN', icon: '🔐' },
  ] : [
    { num: 1, text: 'Open M-Pesa on your phone', icon: '📱' },
    { num: 2, text: 'Select "Lipa na M-Pesa"', icon: '💳', highlight: true },
    { num: 3, text: 'Select "Buy Goods and Services"', icon: '🛒' },
    { num: 4, text: `Enter Till Number: ${formattedTill}`, icon: '🔢', highlight: true },
    { num: 5, text: `Enter Amount: KES ${amount.toLocaleString()}`, icon: '💰' },
    { num: 6, text: 'Enter your M-Pesa PIN', icon: '🔐' },
  ];

  return (
    <TooltipProvider>
      <Card className="border-2 border-safaricom-green shadow-lg">
        <CardHeader className="bg-gradient-to-r from-safaricom-green to-safaricom-dark border-b border-safaricom-dark">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white rounded-lg">
                <MpesaIcon className="h-5 w-5" />
              </div>
              <CardTitle className="text-white text-lg font-bold">
                Lipa na M-Pesa
              </CardTitle>
            </div>
            <Badge className="bg-white text-safaricom-green font-bold">
              {paymentType === 'buy_goods' ? 'Buy Goods' : paymentType === 'stk_push' ? 'STK Push' : 'M-Pesa'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Safaricom Brand Header */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-safaricom-green rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-safaricom-green font-bold text-lg">Safaricom</span>
          </div>

          {/* Till Number Display - HIGH VISIBILITY */}
          <div className="bg-gradient-to-br from-gray-900 to-black text-white p-6 rounded-xl text-center space-y-4 border-2 border-safaricom-green">
            <p className="text-safaricom-light text-sm uppercase tracking-wider font-medium">
              Lipa na M-Pesa Till Number
            </p>
            <div className="text-5xl font-bold tracking-widest font-mono text-white">
              {formattedTill}
            </div>
            <p className="text-gray-400 text-sm">
              Business Name: Karebe Wines & Spirits
            </p>
            
            <Button
              onClick={copyToClipboard}
              className="bg-safaricom-green hover:bg-safaricom-dark text-white border-none"
              size="lg"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Till Number
                </>
              )}
            </Button>
          </div>

          {/* Amount Display */}
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-amber-900">
                Amount to Pay
              </span>
            </div>
            <span className="text-2xl font-bold text-amber-700">
              KES {amount.toLocaleString()}
            </span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Timer className="h-4 w-4" />
            <span>Complete payment within {timeRemaining} minutes</span>
          </div>

          {/* Step-by-Step Guide Toggle */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowGuide(!showGuide)}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            {showGuide ? 'Hide' : 'Show'} Step-by-Step Guide
          </Button>

          {/* Visual Guide */}
          {showGuide && (
            <div className="space-y-3 p-4 bg-mpesa-50 rounded-lg border border-mpesa-200">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    step.highlight
                      ? 'bg-safaricom-green/10 border border-safaricom-green'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{step.icon}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900">
                      Step {step.num}:
                    </span>{' '}
                    <span className={step.highlight ? 'text-safaricom-dark font-medium' : 'text-gray-700'}>
                      {step.text}
                    </span>
                  </div>
                  {step.highlight && (
                    <Badge className="bg-safaricom-green text-white text-xs">
                      Important
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Manual Code Entry */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm text-gray-600">
              Already paid? Enter your M-Pesa confirmation code:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., ABC123XYZ"
                className="flex-1 px-3 py-2 border rounded-lg uppercase"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                maxLength={10}
              />
              <Button
                onClick={() => onPaymentComplete?.(manualCode)}
                disabled={manualCode.length < 8}
              >
                Verify
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-500">
            <p>Having trouble?{' '}
              <a href="tel:+254712345678" className="text-green-600 font-medium underline">
                Call us for assistance
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
