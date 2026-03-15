import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Shield, Bike } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { LoginForm } from '@/features/auth/components/login-form';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { PublicOnlyGuard } from '@/features/auth/components/auth-guard';

// Role type for login
type LoginRole = 'admin' | 'rider';

function LoginContent() {
  const navigate = useNavigate();
  const { login, isLoading, error, user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<LoginRole>('admin');

  // Handle login with proper role-based redirect
  const handleLogin = async (credentials: { username: string; password: string }) => {
    console.log('[LoginPage] Form submitted with username:', credentials.username);
    console.log('[LoginPage] Selected role:', selectedRole);
    await login({ ...credentials, role: selectedRole });
    // Navigation will be handled by the useEffect below that watches user changes
  };

  // Redirect after successful login based on user role
  useEffect(() => {
    if (user) {
      console.log('[LoginPage] User detected, redirecting based on role:', user.role);
      console.log('[LoginPage] User details:', { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        name: user.name 
      });
      // Determine redirect based on role
      switch (user.role) {
        case 'rider':
          console.log('[LoginPage] Redirecting to /rider');
          navigate('/rider', { replace: true });
          break;
        case 'super-admin':
        case 'admin':
          console.log('[LoginPage] Redirecting to /admin');
          navigate('/admin', { replace: true });
          break;
        default:
          console.log('[LoginPage] Unknown role, redirecting to home');
          navigate('/', { replace: true });
      }
    } else if (error) {
      console.error('[LoginPage] Login error detected:', error);
    }
  }, [user, navigate, error]);

  // Dynamic placeholder based on role
  const usernamePlaceholder = selectedRole === 'admin' 
    ? 'e.g. admin@karebe.local' 
    : 'e.g. +254712345678';

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center py-12">
      <Container className="max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-display font-bold text-brand-900">
            Staff Login
          </h1>
          <p className="text-brand-600 mt-2">
            Sign in to access your dashboard
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
        
        <LoginForm
          onSubmit={handleLogin}
          isLoading={isLoading}
          error={error}
          title="Welcome Back"
          description="Enter your credentials to continue"
          usernamePlaceholder={usernamePlaceholder}
        />

        <p className="text-center text-sm text-brand-500 mt-6">
          Protected area. Authorized personnel only.
        </p>

        {/* Register link */}
        <div className="mt-4 text-center">
          <span className="text-sm text-gray-600">Don't have an account? </span>
          <Link
            to="/admin/register"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium underline"
          >
            Register here
          </Link>
        </div>
      </Container>
    </div>
  );
}

export function AdminLoginPage() {
  // Use role-based redirect - if user is already logged in, go to their appropriate dashboard
  return (
    <PublicOnlyGuard>
      <LoginContent />
    </PublicOnlyGuard>
  );
}

export default AdminLoginPage;
