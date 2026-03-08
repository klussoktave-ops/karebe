import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Import and initialize demo data
import { initializeDemoData } from '@/lib/seed';

// Import SEO components
import { ErrorBoundary, AgeVerificationProvider } from '@/components/seo';

// Initialize demo data on app startup
const seedResult = initializeDemoData();
if (seedResult.success) {
  console.log('[KAREBE] Demo data initialized:', seedResult.message);
  if (seedResult.details) {
    console.log('[KAREBE] Seeded:', seedResult.details);
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
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
