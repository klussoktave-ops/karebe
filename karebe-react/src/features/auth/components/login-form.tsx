import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Lock, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
}

/**
 * Admin Login Form Component
 * 
 * Provides username/password login with validation and loading states.
 * Used on the admin and rider login pages.
 * 
 * @example
 * ```tsx
 * <LoginForm 
 *   onSubmit={handleLogin} 
 *   isLoading={isLoading} 
 *   error={error}
 * />
 * ```
 */
export function LoginForm({
  onSubmit,
  isLoading = false,
  error,
  title = 'Welcome Back',
  description = 'Sign in to your account to continue',
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const handleFormSubmit = async (data: LoginFormData) => {
    await onSubmit(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto" elevation="medium">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display text-brand-800">
          {title}
        </CardTitle>
        <CardDescription className="text-brand-600">
          {description}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <Input
              label="Username"
              placeholder="Enter your username"
              icon={<User className="w-4 h-4" />}
              error={errors.username?.message}
              {...register('username')}
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              icon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="mt-1 text-xs text-brand-500 hover:text-brand-700"
            >
              {showPassword ? 'Hide password' : 'Show password'}
            </button>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
            loadingText="Signing in..."
          >
            Sign In
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/**
 * Customer Phone Login Form
 * 
 * Simplified login for customers using phone number
 */
interface CustomerLoginFormProps {
  onSubmit: (phone: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

const phoneSchema = z.object({
  phone: z.string()
    .min(9, 'Phone number must be at least 9 digits')
    .max(13, 'Phone number is too long')
    .regex(/^[0-9+]+$/, 'Invalid phone number format'),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

export function CustomerLoginForm({
  onSubmit,
  isLoading = false,
  error,
}: CustomerLoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: '',
    },
  });

  const handleFormSubmit = async (data: PhoneFormData) => {
    await onSubmit(data.phone);
  };

  return (
    <Card className="w-full max-w-sm mx-auto" elevation="medium">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-display text-brand-800">
          Quick Login
        </CardTitle>
        <CardDescription className="text-brand-600">
          Enter your phone number to continue
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Phone Number"
            type="tel"
            placeholder="e.g. 0712345678"
            error={errors.phone?.message}
            {...register('phone')}
            disabled={isLoading}
          />

          <p className="text-xs text-brand-500 text-center">
            We'll create an account for you if you don't have one
          </p>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
            loadingText="Verifying..."
          >
            Continue
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
