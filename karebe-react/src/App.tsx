import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { DemoBanner } from './components/demo/demo-banner';

// Lazy load pages for code splitting
const CatalogPage = lazy(() => import('./pages/customer/catalog'));
const CartPage = lazy(() => import('./pages/customer/cart'));
const CheckoutPage = lazy(() => import('./pages/customer/checkout'));
const AdminDashboardPage = lazy(() => import('./pages/admin/dashboard'));
const AdminLoginPage = lazy(() => import('./pages/admin/login'));
const AdminOrdersPage = lazy(() => import('./pages/admin/orders'));
const BranchConfigPage = lazy(() => import('./pages/admin/branch-config'));
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
          <Route path="/admin/branches" element={<BranchConfigPage />} />
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
