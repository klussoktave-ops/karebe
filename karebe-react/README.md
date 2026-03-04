# Karebe React

A modern, feature-rich React frontend for the **Karebe Artisan Cosmetics** e-commerce platform. Built with TypeScript, React, Vite, and Tailwind CSS.

![Tech Stack](https://img.shields.io/badge/React-18.2-blue?logo=react)
![Tech Stack](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript)
![Tech Stack](https://img.shields.io/badge/Vite-5.0-purple?logo=vite)
![Tech Stack](https://img.shields.io/badge/Tailwind-3.4-cyan?logo=tailwindcss)
![Tech Stack](https://img.shields.io/badge/Zustand-4.4-orange?logo=react)
![Tech Stack](https://img.shields.io/badge/TanStack_Query-5.17-red?logo=react)

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Features](#features)
- [Folder Structure](#folder-structure)
- [Key Patterns](#key-patterns)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Development Guidelines](#development-guidelines)

---

## 🎯 Overview

Karebe React is a complete e-commerce frontend designed for a cosmetics business with three distinct user roles:

| Role | Description |
|------|-------------|
| **Customer** | Browse products, manage cart, checkout with M-Pesa |
| **Admin** | Manage products, inventory, orders, and system settings |
| **Rider** | View assigned deliveries and update delivery status |

### Key Technologies

- **React 18** with hooks and concurrent features
- **TypeScript** for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with custom brand colors
- **Zustand** for global state management
- **TanStack Query** for server state and caching
- **React Router** for navigation
- **Supabase** for backend and real-time updates
- **Zod** for schema validation

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Karebe React                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │  Features   │  │    Shared/Components    │  │
│  │  (Routes)   │  │  (Business) │  │   (UI, Hooks, Utils)    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│         └────────────────┼─────────────────────┘                │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │   Stores    │                               │
│                   │ (Zustand)   │                               │
│                   └──────┬──────┘                               │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │    API      │                               │
│                   │(TanStack    │                               │
│                   │  Query)     │                               │
│                   └──────┬──────┘                               │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼────┐ ┌─────▼─────┐ ┌───▼────┐
       │ Supabase  │ │   M-Pesa  │ │  API   │
       │ (DB/Auth) │ │ (Payments)│ │(Custom)│
       └───────────┘ └───────────┘ └────────┘
```

### Feature-Based Organization

The codebase follows a **feature-based folder structure** where each feature is self-contained:

```
src/features/{feature}/
├── api/           # API calls and server interactions
├── components/    # Feature-specific React components
├── hooks/         # Custom React hooks
├── stores/        # Zustand stores for local state
├── types/         # TypeScript types
└── utils/         # Feature-specific utilities
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd karebe-react
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** at `http://localhost:5173`

### Quick Setup Verification

After installation, verify everything works:

```bash
# Check TypeScript compilation
npm run type-check

# Check for linting errors
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## ✨ Features

### Customer Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🛍️ Product Catalog | Browse products with filters, search, and sorting | ✅ Complete |
| 🛒 Shopping Cart | Add/remove items, persistent cart with sync | ✅ Complete |
| 💳 Checkout | Multi-step checkout with M-Pesa integration | ✅ Complete |
| 📍 Branch Selection | Select pickup/delivery branches | ✅ Complete |
| 📱 Responsive UI | Mobile-first design with Tailwind CSS | ✅ Complete |

### Admin Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🔐 Authentication | Secure login with role-based access | ✅ Complete |
| 📦 Product Management | CRUD operations for products | ✅ Complete |
| 📊 Inventory Control | Real-time stock management | ✅ Complete |
| 📋 Order Management | View and manage customer orders | ✅ Complete |
| 🏪 Branch Management | Manage multiple store locations | ✅ Complete |

### Rider Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🚚 Delivery Portal | View assigned deliveries | ✅ Complete |
| ✅ Status Updates | Mark deliveries as picked up/delivered | ✅ Complete |
| 📍 Route Info | View delivery addresses and customer info | ✅ Complete |

### Technical Features

| Feature | Description |
|---------|-------------|
| ⚡ Optimized Builds | Code splitting with manual chunks |
| 🔄 Real-time Updates | Supabase realtime subscriptions |
| 💾 Offline Support | Cart persistence in localStorage |
| 🎨 Design System | Consistent UI with class-variance-authority |
| 🔒 Type Safety | Full TypeScript coverage |
| 📱 PWA Ready | Service worker and manifest support |

---

## 📁 Folder Structure

```
karebe-react/
├── public/                  # Static assets
├── src/
│   ├── api/                 # Global API utilities
│   │   └── client.ts        # Axios/fetch wrapper
│   │
│   ├── components/          # Shared components
│   │   ├── ui/              # Primitive UI components (shadcn/ui style)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   │   └── index.ts     # Re-export all UI components
│   │   │
│   │   ├── layout/          # Layout components
│   │   │   ├── container.tsx
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── forms/           # Form components
│   │
│   ├── features/            # Feature-based modules
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   ├── login.ts
│   │   │   │   └── logout.ts
│   │   │   ├── components/
│   │   │   │   ├── auth-guard.tsx
│   │   │   │   └── login-form.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-auth.ts
│   │   │   ├── stores/
│   │   │   │   └── auth-store.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── branches/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── index.ts
│   │   │
│   │   ├── cart/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── checkout/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   └── products/
│   │       ├── api/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── stores/
│   │       ├── types/
│   │       └── index.ts
│   │
│   ├── hooks/               # Global custom hooks
│   │
│   ├── lib/                 # Library configurations
│   │   ├── supabase.ts      # Supabase client
│   │   └── utils.ts         # Utility functions (cn, etc.)
│   │
│   ├── pages/               # Route pages
│   │   ├── customer/        # Customer-facing pages
│   │   │   ├── catalog.tsx
│   │   │   └── cart.tsx
│   │   ├── admin/           # Admin pages
│   │   │   ├── login.tsx
│   │   │   └── dashboard.tsx
│   │   └── rider/           # Rider pages
│   │       └── portal.tsx
│   │
│   ├── stores/              # Global stores
│   │
│   ├── types/               # Global TypeScript types
│   │   └── index.ts
│   │
│   ├── utils/               # Global utilities
│   │
│   ├── App.tsx              # Main app component with routes
│   ├── main.tsx             # App entry point
│   └── index.css            # Global styles
│
├── .env.example             # Environment variable template
├── index.html               # HTML entry
├── package.json             # Dependencies and scripts
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
└── README.md                # This file
```

### Key Directory Explanations

| Directory | Purpose |
|-----------|---------|
| `src/components/ui/` | Reusable, unstyled primitive components using `class-variance-authority` |
| `src/features/` | Self-contained business logic organized by feature |
| `src/pages/` | Top-level route components (lazy-loaded) |
| `src/lib/` | Third-party library configurations |
| `src/types/` | Shared TypeScript interfaces and types |

---

## 🔑 Key Patterns

### 1. Component Architecture with CVA

Components use `class-variance-authority` for consistent, type-safe styling:

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-12 px-6',
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
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
```

### 2. Feature Organization

Features are self-contained with their own API, components, hooks, and stores:

```tsx
// Importing from a feature
import { useCart } from '@/features/cart';
import { ProductCard } from '@/features/products';

// Feature index.ts pattern
export { useCart, useCartMutations } from './hooks';
export { CartItem, CartSummary } from './components';
export { useCartStore } from './stores';
export type { Cart, CartItem } from './types';
```

### 3. State Management with Zustand

Zustand stores for global state with persistence and computed values:

```tsx
// features/cart/stores/cart-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (itemId: string) => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity) => {
        // Implementation
      },
      removeItem: (itemId) => {
        // Implementation
      },
      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.total, 0);
      },
    }),
    { name: 'karebe-cart' }
  )
);
```

### 4. Server State with TanStack Query

Fetching, caching, and updating server state:

```tsx
// features/products/hooks/use-products.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

### 5. Barrel Exports

Each folder exports its public API through an `index.ts`:

```tsx
// Import from feature
import { ProductCard, useProducts } from '@/features/products';

// Import from UI
import { Button, Card, Input } from '@/components/ui';

// Import types
import type { Cart, Product } from '@/types';
```

### 6. Route-Based Code Splitting

Pages are lazy-loaded for optimal bundle size:

```tsx
// App.tsx
import { lazy, Suspense } from 'react';

const CatalogPage = lazy(() => import('./pages/customer/catalog'));
const CartPage = lazy(() => import('./pages/customer/cart'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 7. Form Handling with React Hook Form + Zod

Type-safe forms with validation:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const checkoutSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

function CheckoutForm() {
  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  const onSubmit = (data: CheckoutFormData) => {
    // Handle submission
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# API Configuration
VITE_API_BASE_URL=/api

# App Configuration
VITE_APP_NAME=Karebe
VITE_APP_ENV=development
```

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key | Yes |
| `VITE_API_BASE_URL` | Base path for custom API routes | No |
| `VITE_APP_NAME` | Application name (used in UI) | No |
| `VITE_APP_ENV` | Environment identifier | No |

> **Note**: Variables prefixed with `VITE_` are exposed to the client-side code.

---

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (http://localhost:5173) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint and check for errors |
| `npm run type-check` | Run TypeScript compiler (no emit) |

### Development Workflow

```bash
# Start development
npm run dev

# Before committing - check everything
npm run type-check && npm run lint

# Build for production
npm run build

# Test production build locally
npm run preview
```

---

## 🛠️ Development Guidelines

### Adding a New Feature

1. **Create the feature folder**:
   ```bash
   mkdir -p src/features/my-feature/{api,components,hooks,stores,types}
   ```

2. **Create an `index.ts` for barrel exports**:
   ```tsx
   // src/features/my-feature/index.ts
   export * from './api';
   export * from './components';
   export * from './hooks';
   export * from './stores';
   export type * from './types';
   ```

3. **Follow the feature-based patterns**:
   - API calls in `api/`
   - React components in `components/`
   - Custom hooks in `hooks/`
   - State in `stores/`
   - Types in `types/`

### Adding a New Component

1. **Use the UI component pattern** for primitives:
   ```tsx
   // components/ui/my-component.tsx
   import { cva, type VariantProps } from 'class-variance-authority';
   
   const myComponentVariants = cva('base-classes', {
     variants: { /* ... */ },
   });
   ```

2. **Export from `index.ts`**:
   ```tsx
   export { MyComponent, type MyComponentProps } from './my-component';
   ```

3. **Use the `cn()` utility** for conditional classes:
   ```tsx
   import { cn } from '@/lib/utils';
   
   <div className={cn('base', condition && 'conditional')} />
   ```

### Code Style

- **Use TypeScript** for all new code
- **Prefer named exports** over default exports
- **Use absolute imports** with `@/` aliases
- **Follow existing patterns** in similar files
- **Add JSDoc comments** for public APIs

---

## 🔗 Useful Links

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Class Variance Authority](https://cva.style/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

## 📝 License

This project is proprietary and confidential.

---

**Built with ❤️ for Karebe Artisan Cosmetics**
