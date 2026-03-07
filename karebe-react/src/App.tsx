import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { DemoBanner } from './components/demo/demo-banner';

// Lazy load pages for code splitting
const CatalogPage = lazy(() => import('./pages/customer/catalog'));
const CartPage = lazy(() => import('./pages/customer/cart'));
const CheckoutPage = lazy(() => import('./pages/customer/checkout'));
const AdminDashboardPage = lazy(() => import('./pages/admin/dashboard'));
const AdminLoginPage = lazy(() => import('./pages/admin/login'));
const AdminOrdersPage = lazy(() => import('./pages/admin/orders'));
const AdminProductsPage = lazy(() => import('./pages/admin/products'));
const BranchConfigPage = lazy(() => import('./pages/admin/branch-config'));
const SettingsPage = lazy(() => import('./pages/admin/settings'));
const RidersPage = lazy(() => import('./pages/admin/riders'));
const AdminsPage = lazy(() => import('./pages/admin/admins'));
const RiderPortalPage = lazy(() => import('./pages/rider/portal'));

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
    </div>
  );
}

function App() {
  const location = useLocation();
  
  useEffect(() => {
    console.log('[Router] Navigation to:', location.pathname);
    // Check if current admin route is defined
    const knownAdminRoutes = ['/admin', '/admin/orders', '/admin/branches', '/admin/login', '/admin/settings', '/admin/riders', '/admin/products', '/admin/admins'];
    const isKnownRoute = knownAdminRoutes.some(path => 
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
    if (location.pathname.startsWith('/admin') && !isKnownRoute) {
      console.warn('[Router] WARNING: Route', location.pathname, 'not defined - will redirect to /admin');
    }
  }, [location.pathname]);
  
  return (
    <div className="min-h-screen bg-brand-50">
      <DemoBanner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<CatalogPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/branches" element={<BranchConfigPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="/admin/riders" element={<RidersPage />} />
          <Route path="/admin/admins" element={<AdminsPage />} />
          <Route path="/admin/*" element={<AdminDashboardPage />} />
          
          {/* Rider Routes */}
          <Route path="/rider" element={<RiderPortalPage />} />
          <Route path="/rider/*" element={<RiderPortalPage />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
