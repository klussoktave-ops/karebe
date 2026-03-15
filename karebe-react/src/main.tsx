import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Import and initialize demo data
import { initializeDemoData } from '@/lib/seed';

// Import SEO components and error handler
import { ErrorBoundary, AgeVerificationProvider } from '@/components/seo';
import { setupGlobalErrorHandler } from '@/lib/error-handler';

// Setup global error handlers
setupGlobalErrorHandler();

// Initialize demo data on app startup
const seedResult = initializeDemoData();
if (seedResult.success) {
  console.log('[KAREBE] Demo data initialized:', seedResult.message);
  if (seedResult.details) {
    console.log('[KAREBE] Seeded:', seedResult.details);
  }
}

// Pre-load pricing config on app startup
import { useCartStore } from '@/features/cart/stores/cart-store';
useCartStore.getState().loadPricing();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AgeVerificationProvider>
            <App />
          </AgeVerificationProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
