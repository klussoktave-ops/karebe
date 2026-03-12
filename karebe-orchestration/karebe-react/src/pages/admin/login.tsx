import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Shield, Bike, UserCog } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { LoginForm } from '@/features/auth/components/login-form';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { PublicOnlyGuard } from '@/features/auth/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Check if in dev mode
const isDevMode = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';

function LoginContent() {
  const navigate = useNavigate();
  const { login, isLoading, error, user } = useAuth();

  // Handle login with proper role-based redirect
  const handleLogin = async (credentials: { username: string; password: string }) => {
    await login(credentials);
    // Navigation will be handled by the useEffect below that watches user changes
  };

  // Redirect after successful login based on user role
  useEffect(() => {
    if (user) {
      console.log('[AdminLogin] User detected, redirecting based on role:', user.role);
      // Determine redirect based on role
      switch (user.role) {
        case 'rider':
          navigate('/rider', { replace: true });
          break;
        case 'super-admin':
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  // Quick login for dev mode
  const handleQuickLogin = async (role: 'admin' | 'rider' | 'super-admin') => {
    console.log('[AdminLogin] Quick login clicked for role:', role);
    const credentials = {
      admin: { username: 'admin@karebe.com', password: 'admin123' },
      'super-admin': { username: 'owner@karebe.com', password: 'owner123' },
      rider: { username: 'rider@karebe.com', password: 'rider123' },
    };
    
    await login(credentials[role]);
    // Role-based redirect handled by useEffect
  };

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center py-12">
      <Container className="max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-brand-900">
            Admin Login
          </h1>
          <p className="text-brand-600 mt-2">
            Sign in to access the admin dashboard
          </p>
        </div>
        
        <LoginForm
          onSubmit={handleLogin}
          isLoading={isLoading}
          error={error}
          title="Welcome Back"
          description="Enter your credentials to continue"
        />

        {/* Quick Login - Available in all modes */}
        <Card className="mt-6 p-4 border-2 border-dashed border-brand-300 bg-brand-50/50">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3 text-center">
            Quick Login (Demo)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickLogin('super-admin')}
              className="flex flex-col items-center gap-1 h-auto py-2"
            >
              <Shield className="h-4 w-4" />
              <span className="text-xs">Super Admin</span>
              <span className="text-[10px] text-gray-500">owner@karebe.com</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickLogin('admin')}
              className="flex flex-col items-center gap-1 h-auto py-2"
            >
              <UserCog className="h-4 w-4" />
              <span className="text-xs">Admin</span>
              <span className="text-[10px] text-gray-500">admin@karebe.com</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickLogin('rider')}
              className="flex flex-col items-center gap-1 h-auto py-2"
            >
              <Bike className="h-4 w-4" />
              <span className="text-xs">Rider</span>
              <span className="text-[10px] text-gray-500">rider@karebe.com</span>
            </Button>
          </div>
        </Card>

        <p className="text-center text-sm text-brand-500 mt-6">
          Protected area. Authorized personnel only.
        </p>
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
