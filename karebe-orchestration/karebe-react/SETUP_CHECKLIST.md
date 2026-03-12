# Karebe React - Setup Verification Checklist

Use this checklist to verify the React project is properly set up and ready for development.

---

## ✅ Prerequisites Check

- [ ] **Node.js 18+** installed (`node --version`)
- [ ] **npm** or **yarn** installed (`npm --version`)
- [ ] **Git** installed (`git --version`)

---

## ✅ Environment Setup

- [ ] `.env` file created from `.env.example`
- [ ] `VITE_SUPABASE_URL` set to your Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` set to your Supabase anon key
- [ ] Environment variables loaded correctly

---

## ✅ Dependencies Installation

- [ ] Run `npm install` successfully
- [ ] No dependency conflicts or vulnerabilities
- [ ] `node_modules` folder created

---

## ✅ TypeScript Configuration

- [ ] `tsconfig.json` exists and is valid
- [ ] Path aliases configured (`@/*`, `@components/*`, etc.)
- [ ] Type definitions for all dependencies
- [ ] No TypeScript errors in editor

Run verification:
```bash
npm run type-check
```

Expected: ✅ No errors found

---

## ✅ Build Verification

- [ ] `vite.config.ts` exists and configured
- [ ] Build completes without errors
- [ ] Output directory created (`dist/`)

Run verification:
```bash
npm run build
```

Expected: ✅ Build completed successfully

---

## ✅ Development Server

- [ ] Development server starts successfully
- [ ] Hot reload working
- [ ] No console errors on initial load

Run verification:
```bash
npm run dev
```

Expected: ✅ Server running at http://localhost:5173

---

## ✅ Lint Verification

- [ ] ESLint configured (`.eslintrc.cjs` or in `package.json`)
- [ ] No linting errors

Run verification:
```bash
npm run lint
```

Expected: ✅ No linting errors

---

## ✅ Index.ts Exports Verification

All feature modules should have proper barrel exports:

| Feature | File | Status |
|---------|------|--------|
| Auth | `src/features/auth/index.ts` | ⬜ |
| Branches | `src/features/branches/index.ts` | ⬜ |
| Cart | `src/features/cart/index.ts` | ⬜ |
| Checkout | `src/features/checkout/index.ts` | ⬜ |
| Products | `src/features/products/index.ts` | ⬜ |

Verify by importing in a test file:
```typescript
// Should work without errors
import { useAuth, AuthGuard } from '@/features/auth';
import { useCart, CartSummary } from '@/features/cart';
import { useProducts, ProductCard } from '@/features/products';
import { useCheckout, CheckoutForm } from '@/features/checkout';
import { useBranches, BranchSelector } from '@/features/branches';
import { Button, Card, Input } from '@/components/ui';
import { Container, Header, Sidebar } from '@/components/layout';
```

---

## ✅ Tailwind CSS Configuration

- [ ] `tailwind.config.ts` exists
- [ ] Custom brand colors configured (`brand-*`, `gold-*`)
- [ ] `postcss.config.js` exists
- [ ] Custom animations defined
- [ ] Typography, forms, aspect-ratio plugins configured

---

## ✅ Supabase Integration

- [ ] `src/lib/supabase.ts` exists
- [ ] Supabase client initializes without errors
- [ ] Can connect to Supabase project

Test connection:
```typescript
import { supabase } from '@/lib/supabase';
const { data, error } = await supabase.from('products').select('*').limit(1);
```

---

## ✅ Routing Setup

- [ ] `react-router-dom` configured in `main.tsx`
- [ ] Routes defined in `App.tsx`
- [ ] Lazy loading working for pages

Routes to verify:
- [ ] `/` - Catalog page
- [ ] `/cart` - Cart page
- [ ] `/admin/login` - Admin login
- [ ] `/admin` - Admin dashboard
- [ ] `/rider` - Rider portal

---

## ✅ State Management

- [ ] TanStack Query provider configured
- [ ] Zustand stores working
- [ ] Cart persistence to localStorage

---

## ✅ Component Library

All UI components should render without errors:

- [ ] Button - different variants
- [ ] Card - with header, content, footer
- [ ] Input - with validation states
- [ ] Select - dropdowns
- [ ] Badge - status indicators
- [ ] Dialog - modals
- [ ] Toast - notifications
- [ ] Skeleton - loading states
- [ ] Avatar - user avatars
- [ ] Dropdown Menu
- [ ] Tabs
- [ ] Table
- [ ] Separator

---

## ✅ Responsive Design

- [ ] Mobile view (< 640px) works correctly
- [ ] Tablet view (640px - 1024px) works correctly
- [ ] Desktop view (> 1024px) works correctly
- [ ] Sidebar collapses on mobile
- [ ] Product grid adapts to screen size

---

## ✅ Browser Console

Check browser console for:

- [ ] No React warnings
- [ ] No TypeScript errors
- [ ] No missing key props warnings
- [ ] No deprecated API warnings
- [ ] No CORS errors (if Supabase configured)

---

## ✅ Quick Smoke Tests

### Customer Flow
1. [ ] Navigate to `/` - Catalog loads
2. [ ] Products display with images
3. [ ] Can filter products by category
4. [ ] Can add product to cart
5. [ ] Cart badge updates
6. [ ] Navigate to `/cart` - Cart displays items
7. [ ] Can update quantity in cart
8. [ ] Can remove item from cart

### Admin Flow
1. [ ] Navigate to `/admin/login`
2. [ ] Login form displays
3. [ ] Can enter credentials
4. [ ] After login, redirects to dashboard
5. [ ] Dashboard displays stats

---

## 🚀 Production Readiness

Before deploying to production:

- [ ] All environment variables set for production
- [ ] `npm run build` completes without errors
- [ ] `dist/` folder contains all assets
- [ ] No source maps in production (optional)
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Analytics configured (optional)

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| `Cannot find module '@/*'` | Check `tsconfig.json` paths configuration |
| `VITE_SUPABASE_URL is not defined` | Create `.env` file with Supabase credentials |
| `Failed to load resource` | Check Supabase URL and CORS settings |
| `404 on refresh` | Configure server for SPA fallback |
| `TypeScript errors` | Run `npm run type-check` to identify issues |

---

## ✅ Sign-Off

Once all items are checked, the setup is complete and ready for development.

| Checked By | Date | Notes |
|------------|------|-------|
| | | |

---

**Last Updated:** 2026-03-03
