# Karebe Wines & Spirits — Modern React Architecture Plan

> **Date:** 2026-03-03  
> **Architect:** Technical Architecture Team  
> **Objective:** Transform the current static HTML/Vanilla JS MVP into a modern, scalable React application with sophisticated visual design.

---

## 1. Executive Summary

### Current State
Karebe is a functional MVP for a wine & spirits delivery business with three user personas:
- **Customers** — Browse catalog, manage cart, checkout via M-Pesa/WhatsApp/Call/SMS
- **Admins** — Manage products, orders, riders, branches, view KPIs
- **Riders** — Accept deliveries, update delivery status

The current implementation is vanilla JavaScript (~1,600 lines in a single file), static HTML pages, localStorage-based state management, and Supabase for data persistence.

### Architectural Vision
Transform into a **feature-based, TypeScript-first React application** with:
- Clean separation of concerns (UI, state, API, domain)
- Modern state management (TanStack Query + Zustand)
- Component-driven design system with Tailwind CSS
- Type-safe API layer with auto-generated types
- Scalable folder structure supporting future growth

### Key Improvements
| Area | Current | Proposed |
|------|---------|----------|
| **Framework** | Vanilla JS | React 18 + TypeScript |
| **State** | localStorage + DOM manipulation | TanStack Query + Zustand |
| **Styling** | CSS custom properties | Tailwind + Design Tokens |
| **API** | Ad-hoc fetch calls | Type-safe API layer |
| **Components** | HTML string templates | Reusable React components |
| **Routing** | Multi-page static HTML | React Router SPA |
| **Testing** | Minimal integration tests | Jest + React Testing Library + Playwright |

---

## 2. Architecture Breakdown (Current State)

### 2.1 Folder Structure Analysis

```
karebe/
├── index.html              # Customer catalog page
├── admin.html              # Admin dashboard
├── admin-*.html            # Admin sub-pages (5 files)
├── rider.html              # Rider portal
├── assets/
│   ├── app.js              # 1,575 lines - ALL application logic
│   ├── styles.css          # ~1,000 lines - ALL styling
│   ├── supabase.js         # Minimal Supabase client
│   └── realtime.js         # Real-time subscriptions
├── api/                    # Vercel serverless functions
│   ├── products.js         # CRUD for products
│   ├── cart.js             # Cart operations
│   ├── orders.js           # Order management
│   ├── delivery.js         # Delivery assignments
│   └── admin/login.js      # Authentication
├── supabase/
│   ├── migrations/         # SQL schema files
│   └── functions/          # Edge functions
└── tests/                  # Integration tests
```

### 2.2 Current Architectural Patterns

#### State Management
- **localStorage** as primary state store
- Global state object with manual reconciliation
- Supabase sync as secondary persistence layer
- Session storage for auth tokens

```javascript
// Current pattern (anti-pattern)
const STORAGE_KEY = "karebe_state_v1";
function loadState() { /* parse from localStorage */ }
function saveState(state) { /* stringify to localStorage */ }
```

#### UI Rendering
- Direct DOM manipulation via `innerHTML`
- Event delegation on container elements
- HTML string templates embedded in JS
- Page-based conditional rendering

#### API Integration
- Ad-hoc `fetch()` calls scattered throughout
- No consistent error handling
- No request/response typing
- Serverless functions for backend operations

#### Authentication
- Session-based storage (sessionStorage)
- Simple username/password validation
- Role-based visibility (super-admin, admin, rider)

### 2.3 Identified Anti-Patterns

| Anti-Pattern | Impact | Solution |
|--------------|--------|----------|
| **God Object** — 1,600-line app.js file | Unmaintainable, no separation of concerns | Feature-based module splitting |
| **String-based HTML** | No type safety, XSS vulnerabilities, hard to test | JSX with React components |
| **localStorage as DB** | Data loss risk, no real-time sync, race conditions | TanStack Query + Supabase real-time |
| **Mixed concerns** — UI + state + API in one | Impossible to test in isolation | Layered architecture |
| **No type safety** | Runtime errors, no IDE support | TypeScript throughout |
| **Global CSS** | Naming conflicts, hard to maintain | Tailwind + CSS Modules |
| **Manual DOM manipulation** | Error-prone, no virtual DOM benefits | React rendering |

### 2.4 Implicit Domain Models

```typescript
// Extracted from app.js analysis

// User hierarchy
interface User {
  id: string;
  role: 'super-admin' | 'admin' | 'rider' | 'customer';
  name: string;
  username?: string;
  password?: string; // Plain text in current (security issue)
  phone: string;
  branchId?: string;
  active: boolean;
}

// Product with variants (complex nested structure)
interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  variants: ProductVariant[];
  popular: boolean;
  newArrival: boolean;
  branchId?: string;
}

interface ProductVariant {
  id: string;
  volume: string;
  price: number;
  stock: number;
}

// Order flow
interface Order {
  id: string;
  customerProfileId: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID';
  paymentMethod: 'MPESA_DARAJA' | 'CALL' | 'WHATSAPP' | 'SMS';
  branchId: string;
  createdAt: string;
}

// Delivery management
interface Delivery {
  id: string;
  orderId: string;
  riderId: string;
  status: 'ASSIGNED' | 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED';
  timeline: DeliveryEvent[];
}

// Branch operations
interface Branch {
  id: string;
  name: string;
  location: string;
  phone: string;
  lat?: number;
  lng?: number;
  onShiftUserId?: string;
  isMain: boolean;
}

// Payment infrastructure
interface Till {
  id: string;
  branchId: string;
  tillNumber: string;
  businessShortCode: string;
  accountReference: string;
  active: boolean;
}
```

---

## 3. Proposed React Architecture

### 3.1 New Folder Structure

```
karebe-react/
├── src/
│   ├── app/                    # App-level configuration
│   │   ├── providers.tsx       # Context providers composition
│   │   ├── router.tsx          # React Router configuration
│   │   └── layout.tsx          # Root layout wrapper
│   │
│   ├── features/               # Feature-based modules
│   │   ├── auth/               # Authentication feature
│   │   │   ├── api/
│   │   │   │   ├── login.ts
│   │   │   │   └── logout.ts
│   │   │   ├── components/
│   │   │   │   ├── login-form.tsx
│   │   │   │   └── auth-guard.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.ts
│   │   │   │   └── use-session.ts
│   │   │   ├── stores/
│   │   │   │   └── auth-store.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── products/           # Product catalog feature
│   │   │   ├── api/
│   │   │   │   ├── get-products.ts
│   │   │   │   ├── create-product.ts
│   │   │   │   └── update-stock.ts
│   │   │   ├── components/
│   │   │   │   ├── product-card.tsx
│   │   │   │   ├── product-grid.tsx
│   │   │   │   └── product-filters.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-products.ts
│   │   │   │   └── use-product-mutations.ts
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── cart/               # Shopping cart feature
│   │   ├── orders/             # Order management feature
│   │   ├── delivery/           # Delivery/rider feature
│   │   ├── admin/              # Admin dashboard feature
│   │   └── branches/           # Branch management feature
│   │
│   ├── entities/               # Shared business entities
│   │   ├── user/
│   │   ├── product/
│   │   ├── order/
│   │   └── branch/
│   │
│   ├── shared/                 # Cross-cutting concerns
│   │   ├── api/                # API layer abstraction
│   │   │   ├── client.ts       # Axios/fetch wrapper
│   │   │   ├── supabase.ts     # Supabase client
│   │   │   └── types/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── toast.tsx
│   │   │   └── index.ts
│   │   ├── hooks/              # Shared hooks
│   │   │   ├── use-local-storage.ts
│   │   │   └── use-debounce.ts
│   │   ├── lib/                # Utility functions
│   │   │   ├── formatters.ts   # KES formatting, dates
│   │   │   └── validators.ts
│   │   └── types/              # Global types
│   │
│   ├── pages/                  # Route pages
│   │   ├── customer/
│   │   │   └── catalog.tsx
│   │   ├── admin/
│   │   │   ├── dashboard.tsx
│   │   │   ├── catalog.tsx
│   │   │   ├── products/
│   │   │   │   └── new.tsx
│   │   │   ├── orders.tsx
│   │   │   ├── delivery.tsx
│   │   │   └── system.tsx
│   │   └── rider/
│   │       └── portal.tsx
│   │
│   └── main.tsx                # App entry point
│
├── public/                     # Static assets
├── supabase/                   # Database migrations & edge functions
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### 3.2 State Management Strategy

#### TanStack Query (React Query) — Server State
**Rationale:** Handles caching, background updates, optimistic updates, and error handling automatically.

```typescript
// features/products/hooks/use-products.ts
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/get-products';

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => getProducts(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
```

#### Zustand — Client State
**Rationale:** Lightweight, TypeScript-friendly, no boilerplate. Perfect for UI state like modals, toasts, and cart.

```typescript
// features/cart/stores/cart-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => ({ 
        items: [...state.items, item] 
      })),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id)
      })),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.lineTotal, 0),
    }),
    { name: 'karebe-cart' }
  )
);
```

### 3.3 API Layer Abstraction

```typescript
// shared/api/client.ts
import { createClient } from '@supabase/supabase-js';

// Auto-generated from Supabase schema
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Typed API wrapper with error handling
export async function apiCall<T>(
  operation: () => Promise<{ data: T | null; error: Error | null }>
): Promise<T> {
  const { data, error } = await operation();
  if (error) throw error;
  if (!data) throw new Error('No data returned');
  return data;
}

// Example usage in feature API
// features/products/api/get-products.ts
export async function getProducts(filters?: ProductFilters) {
  let query = supabase
    .from('products')
    .select('*, variants(*), branch:branches(*)');
  
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.maxPrice) {
    query = query.lte('variants.price', filters.maxPrice);
  }
  
  return apiCall(() => query);
}
```

### 3.4 Error Boundary Strategy

```typescript
// shared/ui/error-boundary.tsx
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Feature-specific error boundaries
// features/products/components/product-error-boundary.tsx
export function ProductErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<ProductErrorFallback />}>
      {children}
    </ErrorBoundary>
  );
}
```

### 3.5 Performance Strategy

#### Code Splitting
```typescript
// Lazy load heavy features
const AdminDashboard = lazy(() => import('./pages/admin/dashboard'));
const RiderPortal = lazy(() => import('./pages/rider/portal'));

// Route-based splitting
<Route path="/admin/*" element={
  <Suspense fallback={<PageSkeleton />}>
    <AdminRoutes />
  </Suspense>
} />
```

#### Memoization
```typescript
// Memoize expensive components
export const ProductCard = memo(function ProductCard({ 
  product, 
  onAddToCart 
}: ProductCardProps) {
  // Component logic
});

// Memoize computed values
const totalPrice = useMemo(() => 
  items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  [items]
);
```

#### Virtualization (for long lists)
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// For product catalog with 1000+ items
function VirtualProductGrid({ products }: { products: Product[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280,
  });
  // Render only visible items
}
```

---

## 4. Design System Blueprint

### 4.1 Design Language Inspiration

**"Warm Premium" Aesthetic**
- **Personality:** Sophisticated but approachable, like a high-end boutique
- **Visual Metaphor:** Layered cards with soft shadows (physical product boxes)
- **Motion:** Gentle, purposeful micro-interactions that feel tactile
- **Color:** Warm earth tones inspired by wine/spirits (amber, burgundy, cream)

### 4.2 Color System

```typescript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        brand: {
          50: '#fdf8f4',
          100: '#f9ede0',
          200: '#f3dcc6',
          300: '#ebc4a0',
          400: '#dfa070',
          500: '#d6824a', // Primary accent
          600: '#c86a3a',
          700: '#a65231',
          800: '#86432d',
          900: '#6d3828',
        },
        // Gold accents (for premium feel)
        gold: {
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#e9b463', // Primary gold
          600: '#ca8a04',
        },
        // Semantic colors
        success: '#4f9a6d',
        warning: '#c38b43',
        danger: '#ca6461',
        info: '#5b8cc4',
        // Dark theme base
        dark: {
          bg: '#0f0b0c',
          surface: '#1a1215',
          'surface-2': '#24171c',
        },
        // Light theme base (customer/admin)
        light: {
          bg: '#f8f2e9',
          surface: '#fffaf4',
          'surface-2': '#f7ede0',
        },
      },
    },
  },
};
```

### 4.3 Typography Scale

```typescript
// Using Inter + Playfair Display
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  display: ['Playfair Display', 'serif'], // For headings
}

// Type scale (rem-based)
fontSize: {
  xs: ['0.75rem', { lineHeight: '1rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.75rem' }],
  xl: ['1.25rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5rem', { lineHeight: '2rem' }],
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
}
```

### 4.4 Spacing System

```typescript
spacing: {
  // Based on 4px grid
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
}
```

### 4.5 Component Primitives

#### Button Component
```typescript
// shared/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:pointer-events-none disabled:opacity-55',
  {
    variants: {
      variant: {
        primary: 'bg-brand-500 text-white hover:bg-brand-600 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0',
        secondary: 'bg-surface-2 border border-border text-text hover:bg-surface hover:border-brand-300',
        ghost: 'text-muted hover:text-text hover:bg-surface-2',
        danger: 'bg-danger text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

#### Card Component
```typescript
// shared/ui/card.tsx
import { cva } from 'class-variance-authority';
import { forwardRef } from 'react';

const cardVariants = cva(
  'rounded-2xl border bg-gradient-to-br from-surface to-surface-2 shadow-md overflow-hidden transition-all duration-200',
  {
    variants: {
      elevation: {
        1: 'shadow-sm',
        2: 'shadow-md',
        3: 'shadow-lg hover:shadow-xl hover:-translate-y-0.5',
      },
      interactive: {
        true: 'cursor-pointer hover:border-brand-300',
        false: '',
      },
    },
    defaultVariants: {
      elevation: 2,
      interactive: false,
    },
  }
);

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation, interactive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cardVariants({ elevation, interactive, className })}
        {...props}
      >
        {children}
      </div>
    );
  }
);
```

### 4.6 Accessibility Patterns

```typescript
// shared/ui/visually-hidden.tsx
// For screen reader only content
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <span className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
      {children}
    </span>
  );
}

// Keyboard navigation hook
// shared/hooks/use-keyboard-navigation.ts
export function useKeyboardNavigation(
  containerRef: RefObject<HTMLElement>,
  options: { loop?: boolean; orientation?: 'horizontal' | 'vertical' }
) {
  // Implements roving tabindex pattern
  // Arrow key navigation
  // Home/End keys
}

// ARIA patterns
// - Modal dialogs: role="dialog", aria-modal="true"
// - Toast notifications: role="alert", aria-live="polite"
// - Navigation: role="navigation", aria-current="page"
// - Forms: aria-describedby for error messages
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS with design tokens
- [ ] Set up folder structure
- [ ] Configure ESLint + Prettier
- [ ] Set up TanStack Query
- [ ] Set up Zustand
- [ ] Configure Supabase client with types
- [ ] Create base UI primitives (Button, Card, Input, Badge)

### Phase 2: Core Features (Week 2-3)
- [ ] Authentication flow (login/logout/session)
- [ ] Product catalog (listing, filtering)
- [ ] Shopping cart (add/remove/persist)
- [ ] Customer checkout flow
- [ ] Admin dashboard shell

### Phase 3: Admin Features (Week 4)
- [ ] Product management (CRUD)
- [ ] Order management
- [ ] Delivery assignment
- [ ] Rider management
- [ ] Branch/system settings

### Phase 4: Polish & Testing (Week 5)
- [ ] Error boundaries
- [ ] Loading states
- [ ] Toast notifications
- [ ] Responsive design verification
- [ ] Unit tests for critical paths
- [ ] E2E tests for user flows

### Phase 5: Migration & Deployment (Week 6)
- [ ] Data migration from localStorage
- [ ] Environment configuration
- [ ] Vercel deployment setup
- [ ] Performance optimization
- [ ] Documentation

---

## 6. Code Examples for Core Patterns

### 6.1 Feature-Based API Hook Pattern

```typescript
// features/products/api/get-products.ts
import { supabase } from '@/shared/api/supabase';
import type { Product, ProductFilters } from '../types';

export interface GetProductsResponse {
  products: Product[];
  total: number;
}

export async function getProducts(
  filters?: ProductFilters
): Promise<GetProductsResponse> {
  let query = supabase
    .from('products')
    .select('*, variants(*)', { count: 'exact' });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.maxPrice) {
    query = query.lte('variants.price', filters.maxPrice);
  }
  if (filters?.popular) {
    query = query.eq('popular', true);
  }
  if (filters?.newArrivals) {
    query = query.eq('new_arrival', true);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);
  
  return {
    products: data || [],
    total: count || 0,
  };
}

// features/products/hooks/use-products.ts
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/get-products';
import type { ProductFilters } from '../types';

const PRODUCTS_QUERY_KEY = 'products';

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, filters],
    queryFn: () => getProducts(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

// Usage in component
// features/products/components/product-catalog.tsx
export function ProductCatalog() {
  const [filters, setFilters] = useState<ProductFilters>({});
  const { data, isLoading, error } = useProducts(filters);

  if (isLoading) return <ProductGridSkeleton />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      <ProductFilters filters={filters} onChange={setFilters} />
      <ProductGrid products={data?.products || []} />
    </div>
  );
}
```

### 6.2 Optimistic Updates Pattern

```typescript
// features/cart/hooks/use-cart-mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/api/supabase';
import { useCartStore } from '../stores/cart-store';

export function useAddToCart() {
  const queryClient = useQueryClient();
  const addItem = useCartStore((state) => state.addItem);

  return useMutation({
    mutationFn: async (item: CartItem) => {
      const { error } = await supabase
        .from('cart_items')
        .upsert(item, { onConflict: 'user_id,product_id,variant_id' });
      if (error) throw error;
    },
    onMutate: async (newItem) => {
      // Optimistically update local state
      addItem(newItem);
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      
      // Snapshot previous value
      const previousCart = queryClient.getQueryData(['cart']);
      
      // Return context for rollback
      return { previousCart };
    },
    onError: (err, newItem, context) => {
      // Rollback on error
      queryClient.setQueryData(['cart'], context?.previousCart);
      toast.error('Failed to add item to cart');
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
```

### 6.3 Compound Component Pattern

```typescript
// features/products/components/product-card.tsx
import { createContext, useContext, type ReactNode } from 'react';
import type { Product } from '../types';

interface ProductCardContextValue {
  product: Product;
}

const ProductCardContext = createContext<ProductCardContextValue | null>(null);

function useProductCard() {
  const context = useContext(ProductCardContext);
  if (!context) throw new Error('Must be used within ProductCard');
  return context;
}

interface ProductCardProps {
  product: Product;
  children: ReactNode;
}

export function ProductCard({ product, children }: ProductCardProps) {
  return (
    <ProductCardContext.Provider value={{ product }}>
      <Card elevation={3} interactive className="flex flex-col">
        {children}
      </Card>
    </ProductCardContext.Provider>
  );
}

ProductCard.Image = function ProductCardImage() {
  const { product } = useProductCard();
  return (
    <div className="relative aspect-square overflow-hidden">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      {product.popular && (
        <Badge className="absolute top-2 right-2" variant="gold">
          Popular
        </Badge>
      )}
    </div>
  );
};

ProductCard.Content = function ProductCardContent() {
  const { product } = useProductCard();
  const firstVariant = product.variants[0];
  
  return (
    <div className="p-4 flex-1 flex flex-col">
      <h3 className="font-display text-lg text-text">{product.name}</h3>
      <p className="text-sm text-muted line-clamp-2 mt-1">
        {product.description}
      </p>
      <div className="mt-auto pt-4 flex items-center justify-between">
        <span className="text-xl font-bold text-brand-500">
          {formatKES(firstVariant?.price)}
        </span>
        <Badge variant={firstVariant?.stock > 0 ? 'success' : 'danger'}>
          {firstVariant?.stock > 0 ? 'In Stock' : 'Out of Stock'}
        </Badge>
      </div>
    </div>
  );
};

ProductCard.Actions = function ProductCardActions({ 
  onAddToCart 
}: { 
  onAddToCart: () => void 
}) {
  const { product } = useProductCard();
  const firstVariant = product.variants[0];
  const inStock = firstVariant?.stock > 0;

  return (
    <div className="p-4 pt-0">
      <Button 
        onClick={onAddToCart} 
        disabled={!inStock}
        className="w-full"
      >
        {inStock ? 'Add to Cart' : 'Out of Stock'}
      </Button>
    </div>
  );
};

// Usage
<ProductCard product={product}>
  <ProductCard.Image />
  <ProductCard.Content />
  <ProductCard.Actions onAddToCart={() => addToCart(product)} />
</ProductCard>
```

### 6.4 Route Guard Pattern

```typescript
// features/auth/components/auth-guard.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import type { UserRole } from '../types';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  allowedRoles, 
  fallback 
}: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return fallback || <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Usage in router
{
  path: '/admin/*',
  element: (
    <AuthGuard allowedRoles={['admin', 'super-admin']}>
      <AdminLayout />
    </AuthGuard>
  ),
}
```

### 6.5 Form Handling with React Hook Form

```typescript
// features/products/components/product-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  variants: z.array(z.object({
    volume: z.string().min(1, 'Volume is required'),
    price: z.number().min(0.01, 'Price must be greater than 0'),
    stock: z.number().int().min(0, 'Stock cannot be negative'),
  })).min(1, 'At least one variant is required'),
  popular: z.boolean().default(false),
  newArrival: z.boolean().default(false),
});

type ProductFormData = z.infer<typeof productSchema>;

export function ProductForm({ 
  onSubmit,
  defaultValues 
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormField
        label="Product Name"
        error={errors.name?.message}
      >
        <Input {...register('name')} placeholder="Enter product name" />
      </FormField>

      <FormField
        label="Category"
        error={errors.category?.message}
      >
        <Select {...register('category')}>
          <option value="">Select category</option>
          <option value="Whiskey">Whiskey</option>
          <option value="Wine">Wine</option>
          <option value="Vodka">Vodka</option>
          <option value="Gin">Gin</option>
          <option value="Beer">Beer</option>
        </Select>
      </FormField>

      <div className="space-y-4">
        <label className="font-medium">Variants</label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-4 items-start">
            <Input
              {...register(`variants.${index}.volume`)}
              placeholder="Volume (e.g., 750ml)"
            />
            <Input
              {...register(`variants.${index}.price`, { valueAsNumber: true })}
              placeholder="Price"
              type="number"
            />
            <Input
              {...register(`variants.${index}.stock`, { valueAsNumber: true })}
              placeholder="Stock"
              type="number"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => remove(index)}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ volume: '', price: 0, stock: 0 })}
        >
          Add Variant
        </Button>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Product'}
      </Button>
    </form>
  );
}
```

---

## Summary

This architecture provides:

1. **Scalability** — Feature-based structure allows independent development
2. **Type Safety** — End-to-end TypeScript eliminates runtime errors
3. **Performance** — TanStack Query caching, code splitting, virtualization
4. **Maintainability** — Clear separation of concerns, consistent patterns
5. **Testability** — Isolated units, dependency injection, MSW for mocking
6. **Developer Experience** — Auto-generated types, hot reload, clear conventions

The proposed design system delivers a warm, premium aesthetic that elevates the brand while maintaining accessibility and usability standards.
