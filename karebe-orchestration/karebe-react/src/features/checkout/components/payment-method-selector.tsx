import { CreditCard, Banknote, Building2, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { MpesaIcon } from '@/components/ui/mpesa-icon';
import type { PaymentMethod } from '../types';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const paymentMethods = [
  {
    id: 'mpesa' as PaymentMethod,
    name: 'M-Pesa',
    description: 'Pay via M-Pesa mobile money',
    icon: MpesaIcon,
    color: 'bg-green-500',
  },
  {
    id: 'card' as PaymentMethod,
    name: 'Credit/Debit Card',
    description: 'Pay with Visa, Mastercard',
    icon: CreditCard,
    color: 'bg-blue-500',
  },
  {
    id: 'cash_on_delivery' as PaymentMethod,
    name: 'Cash on Delivery',
    description: 'Pay when you receive your order',
    icon: Banknote,
    color: 'bg-brand-500',
  },
  {
    id: 'bank_transfer' as PaymentMethod,
    name: 'Bank Transfer',
    description: 'Pay via bank transfer',
    icon: Building2,
    color: 'bg-purple-500',
  },
];

export function PaymentMethodSelector({
  selected,
  onSelect,
  disabled = false,
}: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {paymentMethods.map((method) => {
        const Icon = method.icon;
        const isSelected = selected === method.id;

        return (
          <Card
            key={method.id}
            elevation={isSelected ? 'medium' : 'low'}
            interactive={!disabled}
            onClick={() => !disabled && onSelect(method.id)}
            className={`relative p-4 cursor-pointer transition-all ${
              isSelected ? 'ring-2 ring-brand-500' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={`${method.color} text-white p-2 rounded-lg`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-brand-900">{method.name}</h4>
                <p className="text-sm text-brand-500 mt-0.5">
                  {method.description}
                </p>
              </div>
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <Check className="w-5 h-5 text-brand-600" />
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
