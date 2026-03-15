import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Bike, ArrowRight, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type RegisterRole = 'admin' | 'rider';

interface RegisterFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<RegisterRole>('admin');
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Dynamic placeholder based on role
  const identifierPlaceholder = selectedRole === 'admin' 
    ? 'e.g. admin@karebe.local' 
    : 'e.g. +254712345678';
  
  const identifierLabel = selectedRole === 'admin' ? 'Email Address' : 'Phone Number';
  const identifierField = selectedRole === 'admin' ? 'email' : 'phone';

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Name is required';
    }
    if (selectedRole === 'admin') {
      if (!formData.email.trim()) {
        return 'Email is required';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        return 'Please enter a valid email address';
      }
    } else {
      if (!formData.phone.trim()) {
        return 'Phone number is required';
      }
      // Basic phone validation - at least 10 digits
      if (!/^\+?[\d\s-]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
        return 'Please enter a valid phone number';
      }
    }
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_ORCHESTRATION_API_URL || 'https://karebe-api-production.up.railway.app';
      console.log('[AdminRegister] Submitting registration request to:', `${API_URL}/api/auth/register`);
      
      const payload = {
        name: formData.name,
        password: formData.password,
        role: selectedRole === 'admin' ? 'admin' : 'rider',
        ...(selectedRole === 'admin' ? { email: formData.email } : { phone: formData.phone }),
      };
      
      console.log('[AdminRegister] Payload:', { ...payload, password: '***' });

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('[AdminRegister] Response status:', response.status);
      const data = await response.json();
      console.log('[AdminRegister] Response data:', data);

      if (!response.ok) {
        // Handle different error scenarios
        if (response.status === 403) {
          setError('Registration is disabled. Please contact your administrator.');
        } else if (response.status === 409) {
          if (selectedRole === 'admin') {
            setError('An admin with this email already exists. Please login or use a different email.');
          } else {
            setError('A rider with this phone number already exists. Please login or use a different phone.');
          }
        } else if (response.status === 404) {
          setError('Registration endpoint not found. Please contact support.');
        } else if (data.error) {
          setError(data.error);
        } else {
          setError('Registration failed. Please try again.');
        }
        return;
      }

      setSuccess(() => {
        // Redirect to login after short delay
        setTimeout(() => {
          navigate('/admin/login');
        }, 2000);
      });

    } catch (err) {
      console.error('[AdminRegister] Error:', err);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof RegisterFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center py-12">
        <Container className="max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Account Created!
            </h2>
            <p className="text-gray-600 mb-4">
              Your {selectedRole} account has been created successfully.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login...
            </p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center py-12">
      <Container className="max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Create Account
            </h1>
            <p className="text-gray-600 mt-2">
              Register a new staff account
            </p>
          </div>

          {/* Role Selector */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-lg border border-brand-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedRole === 'admin'
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-600 hover:bg-brand-50'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('rider')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedRole === 'rider'
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-600 hover:bg-brand-50'
                }`}
              >
                <Bike className="w-4 h-4" />
                Rider
              </button>
            </div>
          </div>

          {/* Format hint */}
          <p className="text-center text-sm text-brand-500 mb-4">
            {selectedRole === 'admin' 
              ? 'Enter your email address (e.g., admin@karebe.local)' 
              : 'Enter your phone number (e.g., +254712345678)'}
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange('name')}
                disabled={isLoading}
                autoComplete="name"
              />
            </div>

            {selectedRole === 'admin' ? (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  {identifierLabel}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder={identifierPlaceholder}
                  value={formData.email}
                  onChange={handleChange('email')}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  {identifierLabel}
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={identifierPlaceholder}
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  disabled={isLoading}
                  autoComplete="tel"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange('password')}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create {selectedRole === 'admin' ? 'Admin' : 'Rider'} Account
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/admin/login"
                className="text-brand-600 hover:text-brand-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Info Box - Different from setup */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">New staff registration</p>
                <p className="text-amber-700">
                  This page is for adding new staff members. For first-time admin setup, use the setup page.
                </p>
                <Link to="/admin/setup" className="text-amber-800 underline hover:text-amber-900">
                  Go to setup page →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
