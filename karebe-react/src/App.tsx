import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { DemoBanner } from './components/demo/demo-banner';
import { AdminLayout } from './components/layout/admin-layout';
import { PricingSettingsPanel } from './features/admin/components/pricing-settings-panel';

// Direct imports - no lazy loading to avoid 404 errors on Vercel
import CatalogPage from './pages/customer/catalog';
import CartPage from './pages/customer/cart';
import CheckoutPage from './pages/customer/checkout';
import AdminDashboardPage from './pages/admin/dashboard';
import AdminLoginPage from './pages/admin/login';
import AdminOrdersPage from './pages/admin/orders';
import AdminProductsPage from './pages/admin/products';
import BranchConfigPage from './pages/admin/branch-config';
import SettingsPage from './pages/admin/settings';
import RidersPage from './pages/admin/riders';
import AdminsPage from './pages/admin/admins';
import RiderPortalPage from './pages/rider/portal';

function App() {
  const location = useLocation();
  
  useEffect(() => {
    console.log('[Router] Navigation to:', location.pathname);
    // Check if current admin route is defined
    const knownAdminRoutes = ['/admin', '/admin/orders', '/admin/branches', '/admin/login', '/admin/settings', '/admin/riders', '/admin/products', '/admin/admins', '/admin/pricing'];
    const isKnownRoute = knownAdminRoutes.some(path => 
      location.pathname === path || location.pathname.startsWith(path + '/')
    );
    if (location.pathname.startsWith('/admin') && !isKnownRoute) {
      console.warn('[Router] WARNING: Route', location.pathname, 'not defined - will redirect to /admin');
    }
  }, [location.pathname]);
  
  return (
    <div className="min-h-screen bg-brand-50">
      {!location.pathname.startsWith('/admin') && <DemoBanner />}
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<CatalogPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          
          {/* Admin Routes - with Sidebar Layout } */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
          <Route path="/admin/orders" element={<AdminLayout><AdminOrdersPage /></AdminLayout>} />
          <Route path="/admin/products" element={<AdminLayout><AdminProductsPage /></AdminLayout>} />
          <Route path="/admin/branches" element={<AdminLayout><BranchConfigPage /></AdminLayout>} />
          <Route path="/admin/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />
          <Route path="/admin/pricing" element={<AdminLayout><PricingSettingsPanel /></AdminLayout>} />
          <Route path="/admin/riders" element={<AdminLayout><RidersPage /></AdminLayout>} />
          <Route path="/admin/admins" element={<AdminLayout><AdminsPage /></AdminLayout>} />
          <Route path="/admin/*" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
          
          {/* Rider Routes */}
          <Route path="/rider" element={<RiderPortalPage />} />
          <Route path="/rider/*" element={<RiderPortalPage />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </div>
  );
}

export default App;
