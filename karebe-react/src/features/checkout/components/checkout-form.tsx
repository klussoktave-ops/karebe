import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Store, Truck, User, Phone, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PaymentMethodSelector } from './payment-method-selector';
import { useBranches } from '@/features/branches/hooks/use-branches';
import { useSelectedBranchId } from '@/features/branches/stores/branch-store';
import type { CheckoutFormData, PaymentMethod, DeliveryMethod } from '../types';

const checkoutSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  deliveryMethod: z.enum(['delivery', 'pickup']),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
  branchId: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  paymentMethod: z.enum(['mpesa', 'card', 'cash_on_delivery', 'bank_transfer']),
  mpesaPhone: z.string().optional(),
  notes: z.string().optional(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms',
  }),
});

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData) => void;
  isProcessing?: boolean;
}

export function CheckoutForm({ onSubmit, isProcessing = false }: CheckoutFormProps) {
  const { data: branches } = useBranches();
  const selectedBranchId = useSelectedBranchId();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      deliveryMethod: 'delivery',
      paymentMethod: 'mpesa',
      branchId: selectedBranchId || undefined,
      agreeToTerms: false,
    },
  });

  const deliveryMethod = watch('deliveryMethod');
  const paymentMethod = watch('paymentMethod');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            {...register('firstName')}
            error={errors.firstName?.message}
          />
          <Input
            label="Last Name"
            {...register('lastName')}
            error={errors.lastName?.message}
          />
          <Input
            label="Email"
            type="email"
            icon={<Mail className="w-4 h-4" />}
            {...register('email')}
            error={errors.email?.message}
          />
           <Input
             label="Phone"
             icon={<Phone className="w-4 h-4" />}
             {...register('phone')}
             error={errors.phone?.message}
           />
           <p className="text-xs text-brand-500">
             Accepted formats: 07XXXXXXXX, 7XXXXXXXX, +254XXXXXXXXXX, 254XXXXXXXXXX
           </p>
        </CardContent>
      </Card>

      {/* Delivery Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <label className={`flex-1 p-4 border rounded-xl cursor-pointer transition-colors ${
              deliveryMethod === 'delivery' ? 'border-brand-500 bg-brand-50' : 'border-brand-200'
            }`}>
              <input
                type="radio"
                value="delivery"
                {...register('deliveryMethod')}
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-brand-600" />
                <div>
                  <p className="font-medium">Home Delivery</p>
                  <p className="text-sm text-brand-500">Delivered to your address</p>
                </div>
              </div>
            </label>
            <label className={`flex-1 p-4 border rounded-xl cursor-pointer transition-colors ${
              deliveryMethod === 'pickup' ? 'border-brand-500 bg-brand-50' : 'border-brand-200'
            }`}>
              <input
                type="radio"
                value="pickup"
                {...register('deliveryMethod')}
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-brand-600" />
                <div>
                  <p className="font-medium">Store Pickup</p>
                  <p className="text-sm text-brand-500">Collect from branch</p>
                </div>
              </div>
            </label>
          </div>

          {deliveryMethod === 'pickup' && branches && (
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-2">
                Select Branch
              </label>
              <select
                {...register('branchId')}
                className="w-full border border-brand-200 rounded-xl px-4 py-2.5 text-brand-700 focus:ring-2 focus:ring-brand-300"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} - {branch.location}
                  </option>
                ))}
              </select>
            </div>
          )}

          {deliveryMethod === 'delivery' && (
            <Input
              label="Delivery Address"
              icon={<MapPin className="w-4 h-4" />}
              {...register('address.street')}
              error={errors.address?.street?.message}
            />
          )}

          <Input
            label="Delivery Instructions (Optional)"
            icon={<FileText className="w-4 h-4" />}
            {...register('deliveryInstructions')}
          />
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaymentMethodSelector
            selected={paymentMethod}
            onSelect={(method) => setValue('paymentMethod', method)}
          />

          {paymentMethod === 'mpesa' && (
            <Input
              label="M-Pesa Phone Number"
              icon={<Phone className="w-4 h-4" />}
              {...register('mpesaPhone')}
              placeholder="e.g. 0712345678"
            />
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-6">
           <textarea
             label="Order Notes (Optional)"
             {...register('notes')}
             placeholder="Any special instructions..."
             rows={3}
             className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
           />
        </CardContent>
      </Card>

      {/* Terms */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="terms"
          {...register('agreeToTerms')}
          className="mt-1 w-4 h-4 text-brand-600 border-brand-300 rounded focus:ring-brand-500"
        />
        <label htmlFor="terms" className="text-sm text-brand-600">
          I agree to the Terms of Service and Privacy Policy
        </label>
      </div>
      {errors.agreeToTerms && (
        <p className="text-sm text-error-600">{errors.agreeToTerms.message}</p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        fullWidth
        size="lg"
        isLoading={isProcessing}
        loadingText="Processing..."
      >
        Complete Order
      </Button>
    </form>
  );
}
