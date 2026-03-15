# Karebe Ecommerce UI Refactoring Plan

## Executive Summary

This plan addresses three major areas:
1. **Product Card Redesign** - Responsive, breathable layout with improved UX
2. **Product Creation Form** - Reduced friction, category-based size dropdowns, image upload options
3. **Admin Configuration** - Phone numbers, rider management, branch configuration
4. **Vercel Serverless Optimization** - Address function count limit

---

## 1. Product Card Redesign

### Current Issues Identified
- Cards feel squeezed on 13-15" laptops (768px-1440px)
- "+ Add" button becomes distorted under flex
- Quantity input box looks visually heavy
- Layout shifts when items added to cart

### Proposed Solution

```tsx
// Responsive Grid Layout
// Mobile: 1 column
// Tablet (≥640px): 2 columns  
// Desktop (≥1024px): 3 columns
// Large Desktop (≥1280px): 4 columns
```

#### Key Changes:
| Aspect | Current | Proposed |
|--------|---------|----------|
| Grid | Fixed columns | Responsive: 1→2→3→4 |
| Button | Text "+ Add" | Circular icon + badge |
| Quantity | Input on card | Remove (use cart) |
| Flex | May shrink | `flex-shrink-0` on button |
| Spacing | Arbitrary | Consistent spacing system |

#### Component Refactoring:

```tsx
// Product Card - Key Layout
<div className="
  // Breathing room
  p-4 gap-4
  
  // Responsive grid container
  grid grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  xl:grid-cols-4
  gap-4 md:gap-6
">
  {/* Card with proper flex properties */}
  <Card className="flex flex-col">
    {/* Button with flex-shrink-0 to prevent distortion */}
    <button className="flex-shrink-0 w-10 h-10 rounded-full ...">
      <ShoppingCart className="h-5 w-5" />
      {/* Plus badge */}
      <span className="absolute -top-1 -right-1 ...">+</span>
    </button>
  </Card>
</div>
```

#### Mobile-First Responsive Breakpoints:
```css
/* Tailwind responsive prefixes */
xs: 0-639px    -> 1 column
sm: 640px-1023px  -> 2 columns
lg: 1024px-1279px -> 3 columns
xl: 1280px+      -> 4 columns
```

---

## 2. Product Creation Form Improvements

### Database Schema Alignment

#### Current Form Fields (in `admin/products.tsx`):
| Form Field | Database Column | Status |
|------------|-----------------|--------|
| `name` | `name` | ✅ OK |
| `description` | `description` | ✅ OK |
| `price` | `price` | ✅ OK |
| `category` | `category_id` | ❌ Wrong - should reference category ID |
| `stock_quantity` | `stock_quantity` | ✅ OK |
| `image_url` | `image` or `images` | ❌ Wrong field name |
| `unit_size` | N/A | ❌ Does not exist - use variants |
| `is_featured` | `is_featured` | ✅ OK |

#### Schema Issues Found:
1. Form uses `category` (string) but DB uses `category_id` (FK to categories)
2. Form uses `image_url` but DB has `image` (single) and `images` (JSONB array)
3. Form doesn't have `compare_price`
4. Form doesn't have `is_visible`, `is_available`
5. `unit_size` doesn't exist - should use `product_variants` table

### Proposed Form Structure

#### Required Fields:
- ✅ Product name (text)
- ✅ Category (dropdown → stores as category_id)
- ✅ Price (number)
- ✅ Size (category-based dropdown)
- ✅ Image upload (URL / Upload / Camera)

#### Optional Fields:
- ✅ Description (textarea - NOT required)
- Compare price (optional)
- Stock quantity
- Tags

### Category-Based Size Dropdowns

```typescript
const SIZE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  Wine: [
    { value: '375ml', label: '375ml' },
    { value: '750ml', label: '750ml' },
    { value: '1.5L', label: '1.5L' },
  ],
  Beer: [
    { value: '330ml', label: '330ml' },
    { value: '500ml', label: '500ml' },
  ],
  Spirits: [  // Whisky, Vodka, Gin, Rum, Brandy, Tequila
    { value: '350ml', label: '350ml' },
    { value: '700ml', label: '700ml' },
    { value: '750ml', label: '750ml' },
    { value: '1L', label: '1L' },
  ],
  'Soft Drink': [
    { value: '250ml', label: '250ml' },
    { value: '330ml', label: '330ml' },
    { value: '500ml', label: '500ml' },
    { value: '1L', label: '1L' },
    { value: '1.75L', label: '1.75L' },
  ],
};
```

### Image Upload Options

```tsx
// Three modes: URL, Upload, Camera
const [imageMode, setImageMode] = useState<'url' | 'upload' | 'camera'>('url');

// UI
<Tabs value={imageMode} onValueChange={(v) => setImageMode(v as any)}>
  <Tab value="url">URL</Tab>
  <Tab value="upload">Upload</Tab>
  <Tab value="camera">Camera</Tab>
</Tabs>

{imageMode === 'url' && <Input placeholder="https://..." />}
{imageMode === 'upload' && <input type="file" accept="image/*" />}
{imageMode === 'camera' && <input type="file" accept="image/*" capture="environment" />}
```

---

## 3. Admin Configuration

### Phone Number Settings
Currently handled via:
1. **Branch Configuration** - Each branch has a `phone` field in the database
2. **M-Pesa Till Numbers** - Managed in `branch-mpesa-manager.ts`

#### What's Available:
- Branch phone numbers stored in `branches.phone`
- Till numbers stored in `tills` table
- Displayed at checkout via `BranchMpesaManager`

### Rider Management
**Location:** `src/features/admin/services/rider-manager.ts`

Current features:
- Create/Update/Delete riders
- Toggle active status
- Location tracking
- Stats (deliveries, rating, completion rate)

### Branch Configuration
**Location:** `src/features/branches/`

Database fields:
- `id`, `name`, `is_main`, `location`, `phone`, `lat`, `lng`, `operating_hours`

#### Configuration Options:
1. Set main branch
2. Configure operating hours
3. Set branch phone number
4. Configure M-Pesa till/paybill
5. Set service areas

---

## 4. Vercel Serverless Function Limit

### Current API Routes (7 files):
```
api/
├── cart.js           # Cart operations
├── delivery.js       # Delivery management
├── orders.js         # Order management
├── products.js       # Product CRUD
├── admin/
│   └── login.js      # Admin authentication
└── payments/
    └── daraja/
        ├── callback.js   # M-Pesa callback
        └── stkpush.js    # STK push
```

### Additional Supabase Edge Functions (3):
```
supabase/functions/
├── assign-delivery/
├── checkout/
└── update-delivery-status/
```

### Total: 10 functions (approaching 12 limit)

### Recommendations:

#### Option 1: Consolidate Related Endpoints
```
api/
├── products.js   (GET, POST, PUT, DELETE)
├── orders.js    (GET, POST, PUT)
├── cart.js      (GET, POST, PUT, DELETE)
└── admin.js     (login + other admin ops)
```

#### Option 2: Move to Client-Side with Supabase
- Use Supabase client directly for CRUD operations
- Keep only payment callbacks on serverless
- Reduce to 2-3 functions max

#### Option 3: API Routes with Dynamic Handling
```javascript
// api/products.js - Handle multiple operations
export default async function handler(req, res) {
  switch (req.method) {
    case 'GET': return handleGet(req, res);
    case 'POST': return handlePost(req, res);
    case 'PUT': return handlePut(req, res);
    case 'DELETE': return handleDelete(req, res);
  }
}
```

---

## Implementation Roadmap

### Phase 1: Product Card (Priority: High)
- [ ] Refactor grid to mobile-first responsive
- [ ] Replace button with circular icon + badge
- [ ] Remove quantity input from card
- [ ] Add `flex-shrink-0` to prevent distortion
- [ ] Test on 13-15" laptop screens

### Phase 2: Product Form (Priority: High)
- [ ] Align form fields with database schema
- [ ] Add category-based size dropdowns
- [ ] Implement image upload (URL/Upload/Camera)
- [ ] Make description optional
- [ ] Add missing fields (compare_price, is_visible)

### Phase 3: Admin Config (Priority: Medium)
- [ ] Verify phone number in branch config
- [ ] Test rider management CRUD
- [ ] Confirm branch configuration matches DB

### Phase 4: Serverless Optimization (Priority: Medium)
- [ ] Analyze current function usage
- [ ] Consolidate related endpoints
- [ ] Test after optimization

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/features/products/components/product-card.tsx` | Full redesign |
| `src/pages/admin/products.tsx` | Form improvements |
| `src/features/admin/services/product-manager.ts` | Schema alignment |
| `src/features/admin/services/rider-manager.ts` | Verify integration |
| `src/features/admin/services/branch-mpesa-manager.ts` | Phone config |
| `api/*.js` | Consolidate endpoints |

---

## Testing Checklist

### Product Card:
- [ ] Mobile (375px) - 1 column
- [ ] Tablet (768px) - 2 columns
- [ ] Laptop (1366px) - 3 columns
- [ ] Desktop (1920px) - 4 columns
- [ ] Button doesn't distort at any width
- [ ] Hover elevation works
- [ ] No layout shift on add to cart

### Product Form:
- [ ] Name required
- [ ] Category dropdown works
- [ ] Size dropdown changes based on category
- [ ] Image URL works
- [ ] Image upload works
- [ ] Camera capture works
- [ ] Description is optional
- [ ] Form submits successfully

### Admin Config:
- [ ] Phone number editable in branch
- [ ] Rider CRUD works
- [ ] Branch configuration persists