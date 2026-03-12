# Karebe React Architecture & SEO Audit Report

**Project:** Karebe Wines & Spirits E-Commerce  
**Audit Date:** 2026-03-04  
**Auditor:** Senior Frontend Architect  
**Mode:** CSR (Vite + React 18)

---

## 1. Executive Summary

This codebase represents a **well-structured React e-commerce application** with solid foundations in TypeScript, Zustand state management, and TanStack Query. However, it suffers from **critical SEO deficiencies** due to its CSR-only architecture, lacks per-branch SEO pages, and has incomplete M-Pesa payment flow implementation.

**Key Findings:**
- ✅ Strong feature-based folder structure  
- ✅ Modern state management (Zustand + React Query)  
- ✅ Demo data fallback pattern  
- ❌ **NO Server-Side Rendering (SSR)** - Severe SEO limitation  
- ❌ **NO per-branch landing pages** - Lost local SEO opportunity  
- ❌ **NO structured data (JSON-LD)** - Missing LocalBusiness, Product schemas  
- ❌ **NO sitemap.xml or robots.txt**  
- ❌ M-Pesa integration is **mock-only**, no real STK Push  
- ❌ Delivery zones not validated against customer address  

---

## 2. Current Strengths

### 2.1 Architecture Excellence

| Aspect | Implementation | Rating |
|--------|---------------|--------|
| **State Management** | Zustand with persistence | ⭐⭐⭐⭐⭐ |
| **Data Fetching** | TanStack Query with caching | ⭐⭐⭐⭐⭐ |
| **Type Safety** | Full TypeScript coverage | ⭐⭐⭐⭐⭐ |
| **Component Library** | Custom Shadcn-like UI components | ⭐⭐⭐⭐⭐ |
| **Feature Organization** | Feature-based folder structure | ⭐⭐⭐⭐⭐ |
| **Code Splitting** | Lazy-loaded routes | ⭐⭐⭐⭐⭐ |
| **Form Handling** | React Hook Form + Zod | ⭐⭐⭐⭐⭐.2 Key Strengths Detail

1. **Feature-S |

### 2liced Design (FSD)**: The `src/features/` directory properly isolates business logic by domain:
   ```
   src/features/
   ├── branches/     # Branch selection & data
   ├── cart/         # Cart state & operations
   ├── checkout/     # Checkout flow
   ├── products/     # Product catalog
   ├── payments/     # M-Pesa integration
   ├── delivery/    # Rider services
   └── orders/      # Order management
   ```

2. **Dual Environment Support**: Seamless fallback between Supabase and demo data ensures development continuity.

3. **Zustand Persistence**: Cart and branch selection persist to localStorage, surviving page reloads.

4. **Responsive Mobile-First**: Tailwind CSS with proper mobile breakpoints, sticky checkout buttons.

---

## 3. Critical Gaps

### 3.1 SEO & Discoverability (CRITICAL)

| Gap | Severity | Impact |
|-----|----------|--------|
| No SSR/SSG | 🔴 CRITICAL | Search engines may not index content properly |
| No per-branch pages | 🔴 CRITICAL | Lost local SEO for Westlands, Kilimani, etc. |
| No JSON-LD structured data | 🔴 CRITICAL | No rich snippets in Google |
| No sitemap.xml | 🔴 CRITICAL | Search engines can't discover all pages |
| No robots.txt | 🔴 HIGH | No crawl directives |
| Generic meta tags | 🔴 HIGH | Poor CTR in SERPs |
| No Open Graph tags | 🔴 HIGH | Poor social sharing |

### 3.2 Branch & Delivery Logic

| Gap | Severity | Impact |
|-----|----------|--------|
| No delivery zone validation | 🔴 HIGH | Orders to unreachable areas |
| Static delivery fee (KES 300) | 🟡 MEDIUM | Doesn't account for distance |
| No geo-based branch routing | 🔴 HIGH | Customer not auto-assigned to nearest branch |
| No stock per branch | 🔴 HIGH | Shows available stock across all branches |

### 3.3 Payment Integration

| Gap | Severity | Impact |
|-----|----------|--------|
| M-Pesa STK Push is MOCK | 🔴 CRITICAL | No real payment processing |
| No server-side payment verification | 🔴 CRITICAL | Security risk |
| No webhook handling for M-Pesa callbacks | 🔴 CRITICAL | Payment status not updated |
| Manual code entry without verification | 🟡 MEDIUM | Prone to fraud |

---

## 4. SEO & Structured Data Gaps

### 4.1 Missing Per-Branch Pages

The app has 3 branches in demo data:
- **Wangige Main** - Wangige Town Centre, Kiambu County
- **Karura Branch** - Karura Shopping Centre, Kiambu Road  
- **City Center** - Moi Avenue, Nairobi CBD

**Current State:** No dedicated URLs like `/branches/westlands`, `/branches/kilimani`

**Required Pages:**
```
/branches/wangige      → Wangige Main
/branches/karura       → Karura Branch
/branches/city-center   → City Center
```

Each should have:
- Unique `<title>`: "Karebe Wangige - Wines & Spirits Near You"
- Unique `<meta description>`: "Visit Karebe Wines at Wangige Town Centre..."
- LocalBusiness JSON-LD
- Opening hours
- Google Maps embed
- Directions button

### 4.2 Missing JSON-LD Structured Data

```json
// LocalBusiness for each branch
{
  "@context": "https://schema.org",
  "@type": "LiquorStore",
  "name": "Karebe Wines & Spirits - Wangige",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Wangige Town Centre, Off Waiyaki Way",
    "addressLocality": "Wangige",
    "addressRegion": "Kiambu County",
    "addressCountry": "KE"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -1.2195,
    "longitude": 36.7088
  },
  "telephone": "+254720123456",
  "openingHours": ["Mo-Fr 08:00-22:00", "Sa-Su 09:00-23:00"],
  "priceRange": "KES",
  "servesCuisine": "Alcoholic Beverages"
}
```

```json
// Product schema for each product
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Johnnie Walker Black Label",
  "description": "A true icon, Johnnie Walker Black Label...",
  "brand": { "@type": "Brand", "name": "Johnnie Walker" },
  "offers": {
    "@type": "Offer",
    "price": "4500",
    "priceCurrency": "KES",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "156"
  }
}
```

### 4.3 Technical SEO Gaps

| Item | Status | Fix Required |
|------|--------|--------------|
| sitemap.xml | ❌ MISSING | Generate at build time or use plugin |
| robots.txt | ❌ MISSING | Allow crawlers, Sitemap reference |
| Canonical URLs | ❌ MISSING | Self-referencing canonicals |
| hreflang | ❌ MISSING | For multi-language (EN-SW) |
| Image alt attributes | ⚠️ PARTIAL | Some images missing |
| Optimized filenames | ❌ MISSING | IMG_0023.jpg style names |

---

## 5. Commerce & Payment Gaps

### 5.1 Delivery Flow Issues

**Current Logic** (cart-store.ts:59):
```typescript
const deliveryFee = subtotal > 5000 ? 0 : 300; // Hardcoded!
```

**Problems:**
1. No address validation against delivery zones
2. No distance calculation
3. Flat fee regardless of location
4. No same-day vs next-day delivery options
5. No delivery time slots

**Required:**
- Delivery zone polygon definitions per branch
- Distance matrix API integration
- Dynamic fee calculation: `baseFee + (distanceKm * rate)`

### 5.2 M-Pesa Integration Issues

**Current Flow** (mpesa-service.ts):
```typescript
async initiateStkPush(request: StkPushRequest): Promise<StkPushResponse> {
  // Mock response - NO REAL API CALL
  return { success: true, checkoutRequestId: `CHK-${Date.now()}...` };
}
```

**Backend** (api/payments/daraja/stkpush.js):
```javascript
// Returns mock data - no actual Daraja API integration
return res.status(200).json({
  ok: true,
  provider: "safaricom-daraja",
  environment: "sandbox",  // Always sandbox!
  customerMessage: "STK push request accepted (mock)."
});
```

**Missing Components:**
1. OAuth token generation for Daraja API
2. STK Push request signing
3. Webhook callback handler for payment confirmation
4. Transaction status query (poll-based)
5. Timeout handling (15-minute window)
6. Retry logic with exponential backoff

### 5.3 Cart & Inventory Issues

**Stock Not Branch-Aware:**
```typescript
// products/api/get-products.ts:28
stockQuantity: demoProduct.variants.reduce((sum, v) => sum + v.stock, 0),
// Shows TOTAL stock across ALL branches
```

**Missing:**
- Per-branch inventory query
- Stock reservation during checkout
- Real-time stock updates via Supabase Realtime

---

## 6. Architectural Risks

### 6.1 Scalability Concerns

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Tight Coupling** | MpesaService instantiated directly in components | Use dependency injection |
| **Demo/Production Split** | Dual data source pattern scattered across files | Centralize with Adapter pattern |
| **Large Bundle** | All features bundled, only routes are lazy | Analyze with source-map-explorer |
| **No Error Boundaries** | Component errors crash entire app | Add ErrorBoundary wrapper |
| **Memory Leaks** | Listeners not cleaned up in hooks | Use useEffect cleanup |

### 6.2 Security Concerns

| Issue | Location | Risk |
|-------|----------|------|
| Client-side M-Pesa validation | mpesa-service.ts | Users can manipulate |
| No CSRF protection | API routes | Cross-site requests |
| localStorage sensitive data | Cart persistence | XSS vulnerability |
| Hardcoded till number | mpesa-payment-section.tsx:30 | tillNumber = '123456' |

---

## 7. High-Impact Quick Wins

### 7.1 Immediate SEO Fixes (Week 1)

**Add sitemap.xml and robots.txt to public folder:**

```xml
<!-- public/robots.txt -->
User-agent: *
Allow: /
Sitemap: https://karebe.co.ke/sitemap.xml

<!-- public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://karebe.co.ke/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://karebe.co.ke/cart</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://karebe.co.ke/checkout</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### 7.2 Add JSON-LD to Catalog Page

```tsx
// In catalog.tsx - add useEffect for structured data
useEffect(() => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Karebe Wines & Spirits",
    "description": "Premium wines and spirits in Kenya",
    "url": "https://karebe.co.ke",
    "priceRange": "KES",
    "telephone": "+254720123456",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "KE",
      "addressLocality": "Nairobi"
    },
    "openingHoursSpecification": [
      {
        "@type":",
        "day "OpeningHoursSpecificationOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "22:00"
      }
    ]
  };
  
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
  
  return () => document.head.removeChild(script);
}, []);
```

### 7.3 Age Verification Modal

```tsx
// Add to App.tsx
function AgeVerificationModal() {
  const [verified, setVerified] = useState(false);
  
  useEffect(() => {
    const stored = localStorage.getItem('age-verified');
    if (stored === 'true') setVerified(true);
  }, []);
  
  if (verified) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Are you 18 or older?</h2>
        <p className="text-gray-600 mb-6">
          You must be 18+ to purchase alcohol in Kenya.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => {
            localStorage.setItem('age-verified', 'true');
            setVerified(true);
          }}>
            Yes, I am 18+
          </Button>
          <Button variant="outline" onClick={() => window.location.href = 'https://google.com'}>
            No, leave
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 7.4 WhatsApp Quick Order CTA

```tsx
// Floating action component - add to layout
function WhatsAppOrderFAB() {
  const orderLink = `https://wa.me/254720123456?text=${encodeURIComponent(
    "Hi Karebe! I'd like to order:\n\n"
  )}`;
  
  return (
    <a 
      href={orderLink}
      className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors z-40"
      aria-label="Order via WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
    </a>
  );
}
```

---

## 8. Long-Term Architecture Plan

### 8.1 Recommendation: Migrate to Next.js

**Decision: STRONGLY RECOMMEND** ✅

**Justification:**
1. **SEO Critical** - Liquor store needs local SEO for each branch
2. **Per-Branch SSR** - Dynamic metadata per branch page
3. **ISR** - Incremental Static Regeneration for product pages
4. **API Routes** - Built-in backend for M-Pesa webhooks
5. **Image Optimization** - next/image with automatic WebP conversion

### 8.2 Proposed Folder Restructure

```
karebe-next/
├── app/
│   ├── (shop)/
│   │   ├── page.tsx                    # Homepage
│   │   ├── products/
│   │   │   ├── page.tsx               # Catalog
│   │   │   └── [slug]/page.tsx        # Product detail
│   │   └── cart/page.tsx
│   ├── branches/
│   │   ├── page.tsx                   # All branches
│   │   ├── [slug]/page.tsx           # Per-branch page
│   │   └── [slug]/products/page.tsx   # Branch-specific inventory
│   ├── checkout/
│   │   ├── page.tsx
│   │   └── success/page.tsx
│   ├── api/
│   │   ├── mpesa/
│   │   │   ├── stkpush/route.ts
│   │   │   ├── callback/route.ts
│   │   │   └── status/route.ts
│   │   └── webhooks/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                             # Shadcn components
│   ├── features/                       # Feature components
│   └── seo/                            # SEO components
├── lib/
│   ├── supabase.ts
│   ├── mpesa.ts                        # Daraja API client
│   └── delivery-zones.ts              # Geo polygons
├── types/
└── public/
    └── sitemap.xml                     # Generated
```

### 8.3 Branch Domain Model

```typescript
// types/branch.ts
interface Branch {
  id: string;
  slug: string;                    // 'wangige', 'karura', 'city-center'
  name: string;
  displayName: string;              // "Wangige Main"
  address: Address;
  geo: GeoCoordinates;
  phone: string;
  email: string;
  operatingHours: OperatingHours;
  deliveryZone: DeliveryZone;      // Polygon
  mpesaConfig: MpesaConfig;
  isActive: boolean;
}

interface DeliveryZone {
  type: 'polygon' | 'radius';
  center: GeoCoordinates;
  radiusKm?: number;
  polygon?: [number, number][];    // Array of [lat, lng]
  deliveryFeeBase: number;
  freeDeliveryThreshold: number;
}
```

### 8.4 Delivery Zone Modeling

```typescript
// lib/delivery-zones.ts
export const deliveryZones: DeliveryZone[] = [
  {
    id: 'zone-wangige',
    branchId: 'branch-wangige',
    type: 'polygon',
    polygon: [
      [-1.2100, 36.7000],
      [-1.2100, 36.7200],
      [-1.2300, 36.7200],
      [-1.2300, 36.7000],
    ],
    deliveryFeeBase: 0,
    freeDeliveryThreshold: 5000,
  },
  // ... more zones
];

export function findDeliveryZone(address: string): DeliveryZone | null {
  // Use geocoding API to convert address to coordinates
  // Check if point falls within any polygon
}

export function calculateDeliveryFee(
  zone: DeliveryZone,
  distanceKm: number
): number {
  if (zone.freeDeliveryThreshold > 0) return 0;
  return zone.deliveryFeeBase + (distanceKm * 50); // KES 50/km
}
```

### 8.5 M-Pesa Payment Abstraction Layer

```typescript
// lib/payments/mpesa.ts
interface MpesaPaymentProvider {
  initiateSTKPush(params: STKPushParams): Promise<STKPushResponse>;
  checkStatus(checkoutId: string): Promise<PaymentStatus>;
  handleCallback(payload: MpesaCallback): Promise<void>;
}

class DarajaProvider implements MpesaPaymentProvider {
  private credentials: MpesaCredentials;
  
  async initiateSTKPush(params: STKPushParams): Promise<STKPushResponse> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: this.credentials.shortcode,
          Password: this.generatePassword(),
          Timestamp: this.generateTimestamp(),
          TransactionType: 'CustomerBuyGoodsOnline',
          Amount: params.amount,
          PartyA: params.phone,
          PartyB: this.credentials.shortcode,
          PhoneNumber: params.phone,
          CallBackURL: `${process.env.MPESA_CALLBACK_URL}/api/mpesa/callback`,
          AccountReference: params.orderId,
          TransactionDesc: `Karebe Order ${params.orderId}`,
        }),
      }
    );
    
    return response.json();
  }
  
  private async getAccessToken(): Promise<string> {
    // OAuth with consumer_key & consumer_secret
    // Cache token for 1 hour
  }
}
```

### 8.6 Structured Data Injection Strategy

```tsx
// components/seo/structured-data.tsx
'use client';

import { usePathname } from 'next/navigation';

export function useStructuredData<T extends object>(data: T) {
  const json = JSON.stringify(data);
  
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = json;
    document.head.appendChild(script);
    
    return () => document.head.removeChild(script);
  }, [json]);
}

// Usage in branch page
export default function BranchPage({ branch }: { branch: Branch }) {
  useStructuredData({
    "@context": "https://schema.org",
    "@type": "LiquorStore",
    "name": `Karebe - ${branch.displayName}`,
    "address": branch.address,
    "geo": branch.geo,
    "telephone": branch.phone,
    "openingHours": branch.operatingHours,
  });
  
  // ... render
}
```

### 8.7 Image Optimization Strategy

| Current | Recommended |
|---------|-------------|
| Raw Unsplash URLs | next/image with quality: 80 |
| No format conversion | Automatic WebP/AVIF |
| No lazy loading | Blur placeholder |
| No responsive srcset | Automatic responsive |

```tsx
import Image from 'next/image';

<Image
  src={product.images[0]}
  alt={product.name}
  width={600}
  height={600}
  sizes="(max-width: 768px) 100vw, 50vw"
  placeholder="blur"
  blurDataURL={product.blurHash}
  priority={index < 4}  // LCP optimization
/>
```

---

## 9. Example Code Fixes

### 9.1 Branch-Aware Stock Query

```typescript
// products/api/get-products.ts - Add branch filter
export async function getProducts(
  filters: ProductFilters & { branchId?: string }
): Promise<PaginatedResponse<ProductDisplay>> {
  let query = supabase
    .from('products')
    .select('*, variants:product_variants(*)');
  
  // Filter by branch inventory
  if (filters.branchId) {
    query = query.eq('branch_inventory.branch_id', filters.branchId);
  }
  
  // ... rest of query
}
```

### 9.2 Dynamic Delivery Fee

```typescript
// delivery/utils.ts
export async function calculateDeliveryFee(
  customerAddress: string,
  branchId: string
): Promise<DeliveryQuote> {
  const branch = await getBranchById(branchId);
  const zone = findDeliveryZone(customerAddress);
  
  if (!zone) {
    return { available: false, reason: 'Outside delivery area' };
  }
  
  // Optional: Use Google Distance Matrix for precise fee
  const distance = await calculateDistance(
    branch.geo,
    customerAddress.coordinates
  );
  
  const fee = zone.baseFee + (distance * zone.ratePerKm);
  
  return {
    available: true,
    fee,
    estimatedDays: distance < 10 ? 1 : 2,
    freeDeliveryOver: zone.freeDeliveryThreshold,
  };
}
```

### 9.3 Error Boundary Component

```tsx
// components/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';

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
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Send to error reporting service
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">
            We're working on fixing this issue.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

---

## 10. Migration Roadmap

### Phase 1: Quick Wins (Week 1-2)
- [ ] Add ErrorBoundary to App
- [ ] Add age verification modal
- [ ] Add WhatsApp FAB
- [ ] Add basic JSON-LD to catalog

### Phase 2: SEO Foundation (Week 3-4)
- [ ] Generate sitemap.xml
- [ ] Create robots.txt
- [ ] Add canonical URLs
- [ ] Add Open Graph tags

### Phase 3: Architecture (Month 2)
- [ ] Plan Next.js migration
- [ ] Design delivery zone system
- [ ] Implement real M-Pesa integration

### Phase 4: Local SEO (Month 3)
- [ ] Create per-branch pages
- [ ] Add LocalBusiness JSON-LD per branch
- [ ] Add Google Maps embeds
- [ ] Optimize for "wine shop near me" queries

---

## Conclusion

This codebase demonstrates **excellent React architecture** with modern patterns. However, the **CSR-only approach is fundamentally incompatible** with the business goal of capturing local search traffic for each branch. The M-Pesa integration, while architecturally sound, is currently non-functional for real payments.

**Primary Recommendation:** Begin Next.js migration immediately to capture local SEO opportunity for the three branches. This is a business-critical issue as competitors with better local SEO will capture "wine shop near me" searches in Westlands, Kilimani, and other Nairobi areas.