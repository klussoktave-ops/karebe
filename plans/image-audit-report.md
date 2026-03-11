# Karebe Image Audit Report

## Executive Summary

This report documents the findings of a comprehensive image audit across the Karebe e-commerce codebase, covering both the React frontend (`karebe-react`) and the legacy vanilla JS frontend (`assets/app.js`).

---

## Phase 1: Image Inventory

### Total Unique Image Locations: 19 instances

| # | File Path | Component/Context | Image Type |
|---|-----------|-------------------|------------|
| 1 | `assets/app.js` | Product card | Dynamic product image |
| 2 | `index.html` (legacy) | Promo grid | External Pexels image |
| 3 | `karebe-react/src/pages/admin/products.tsx` | Product form preview (line 272) | Uploaded image preview |
| 4 | `karebe-react/src/pages/admin/products.tsx` | Product form preview (line 336) | URL input preview |
| 5 | `karebe-react/src/pages/admin/products.tsx` | Product form preview (line 371) | Camera capture preview |
| 6 | `karebe-react/src/pages/admin/products.tsx` | Product grid card (line 605) | Product thumbnail |
| 7 | `karebe-react/src/pages/customer/catalog.tsx` | Hero banner | Static banner image |
| 8 | `karebe-react/src/pages/customer/catalog.tsx` | Cart item | Product thumbnail |
| 9 | `karebe-react/src/components/ui/avatar.tsx` | Avatar component | User profile image |
| 10 | `karebe-react/src/features/products/components/product-card.tsx` | Grid layout image | Product image |
| 11 | `karebe-react/src/features/products/components/product-card.tsx` | List layout image | Product image |
| 12 | `karebe-react/src/components/ui/image-gallery.tsx` | Gallery thumbnail | Uploaded product images |
| 13 | `karebe-react/src/features/cart/components/cart-item.tsx` | Compact cart item | Product thumbnail |
| 14 | `karebe-react/src/features/cart/components/cart-item.tsx` | Full cart item | Product thumbnail |
| 15 | `karebe-react/src/features/admin/components/banner-manager.tsx` | Active banner display | Banner image |
| 16 | `karebe-react/src/features/admin/components/banner-manager.tsx` | Banner preview | Upload preview |
| 17 | `karebe-react/src/features/admin/components/banner-manager.tsx` | Banner library | Thumbnail list |
| 18 | `karebe-react/src/features/admin/components/banner-manager.tsx` | Banner detail dialog | Full banner view |

---

## Phase 2: Current Sizing Behavior Analysis

### Detailed Sizing Matrix

| Location | Width Defined | Height Defined | Aspect Ratio | Sizing Method |
|----------|---------------|-----------------|--------------|---------------|
| ProductCard grid | No (uses aspect-square) | No (uses aspect-square) | Yes - 1:1 | Tailwind `aspect-square` + `h-full w-full object-cover` |
| ProductCard list | Yes - `w-32` | Yes - `h-32` | Yes - 1:1 | Tailwind fixed pixels |
| CartItem compact | Yes - `w-14 h-14` (responsive) | Yes - responsive | Yes - 1:1 | Tailwind responsive `w-14 h-14 sm:w-16 sm:h-16` |
| CartItem full | Yes - `w-24` | Yes - `h-24` | Yes - 1:1 | Tailwind fixed pixels |
| Avatar | Yes - via size variant | Yes - via size variant | Yes - circle | CVA variants: `h-6 w-6` to `h-20 w-20` |
| Banner | Yes - `w-full` | Yes - `h-48 md:h-64` | No fixed ratio | Tailwind responsive |
| Admin product preview | Yes - `w-full` | Yes - `h-40` | No | Tailwind fixed |
| Admin product grid | Yes - `w-full` | Yes - `h-40` | Yes - varies | Tailwind fixed height |
| Banner manager | Yes - `w-full` | Yes - `h-48` | No fixed ratio | Tailwind fixed height |
| Banner library | Yes - `w-full` | Yes - `h-24` | No fixed ratio | Tailwind fixed |

### Key Observations

1. **Product Cards (Grid)**: Use `aspect-square` container with `object-cover` - proper sizing
2. **Product Cards (List)**: Fixed 128x128px - proper sizing  
3. **Cart Items**: Fixed sizes with responsive variants - proper sizing
4. **Avatars**: Well-defined via CVA variants - proper sizing
5. **Hero Banner**: Responsive with `h-48 md:h-64` - could have aspect ratio issues
6. **Admin Product Grid**: Fixed height `h-40` - may stretch images

---

## Phase 3: Visual Risk Areas

### Identified Layout Risks

| Risk Level | Location | Issue | Impact |
|------------|----------|-------|--------|
| **HIGH** | `catalog.tsx` hero banner | No max-height constraint, relies on uploaded image dimensions | Banner may be too tall or short depending on source image |
| **HIGH** | Admin product grid | Fixed `h-40` height without aspect ratio | Images stretch/compress if originals differ |
| **MEDIUM** | Banner manager library | Fixed `h-24` for thumbnails | Potential distortion on varied aspect ratios |
| **MEDIUM** | Product card grid | Uses `aspect-square` but no max-size constraints | Could expand beyond intended container on very large screens |
| **LOW** | ImageGallery thumbnails | Variable sizing based on container | Generally handled by `object-cover` |
| **LOW** | Cart item images | Fixed pixel sizes | Proper handling |

### Specific Risk Cases

1. **Hero Banner (`catalog.tsx` line 59-63)**
   - Code: `className="w-full h-48 md:h-64 object-cover rounded-b-2xl"`
   - Risk: Width stretches to container, height is fixed - potential aspect ratio distortion
   - Recommendation: Add aspect ratio container or max-height

2. **Admin Product Grid (`products.tsx` line 604-608)**
   - Code: `className="w-full h-full object-cover"`
   - Risk: Parent has `h-40` fixed, no aspect ratio enforcement
   - Recommendation: Add `aspect-square` to parent container

3. **Banner Thumbnails (`banner-manager.tsx` line 189-193)**
   - Code: `className="w-full h-24 object-cover"`
   - Risk: Fixed height without aspect ratio
   - Recommendation: Add `aspect-video` or similar

---

## Phase 4: Identified Patterns

### Pattern Summary

| Pattern Name | Instances | Description | Sizing Approach |
|--------------|-----------|-------------|-----------------|
| **Product Thumbnail** | 5 | Product images in cards, cart, lists | `object-cover` with fixed aspect ratio |
| **User Avatar** | 2 | Profile images with fallback | CVA variants with `object-cover` |
| **Hero Banner** | 2 | Homepage/catalog banners | Responsive width + fixed height |
| **Admin Upload Preview** | 4 | Image upload forms | Fixed height with `object-cover` |
| **Gallery Thumbnails** | 1 | Image gallery component | Variable, container-dependent |
| **Legacy Product Card** | 1 | Vanilla JS product display | No explicit constraints |

### Sizing Strategy Distribution

- **Tailwind `aspect-square`**: 1 pattern (ProductCard grid)
- **Tailwind fixed pixels**: 4 patterns (ProductCard list, CartItem, Admin preview, Banner)
- **Tailwind responsive**: 2 patterns (Banner, Catalog hero)
- **CVA variants**: 1 pattern (Avatar)
- **No constraints**: 1 pattern (Legacy app.js)

### Key Findings

1. **Primary Sizing Method**: Tailwind CSS utility classes
2. **Most Common**: `object-cover` with fixed or aspect-ratio containers
3. **Inconsistent Areas**: 
   - Hero banner has no aspect ratio constraint
   - Admin product grid uses fixed height without aspect ratio
   - Legacy code has no image constraints

---

## Phase 5: Low-Hanging Improvements

### Recommended Fixes (Priority Order)

| Priority | Issue | File | Fix |
|----------|-------|------|-----|
| 1 | Hero banner aspect ratio | `catalog.tsx` | Add `aspect-[3/1]` or max-height |
| 2 | Admin product grid aspect ratio | `products.tsx` | Add `aspect-square` to container |
| 3 | Banner thumbnail aspect ratio | `banner-manager.tsx` | Add `aspect-[16/9]` or consistent ratio |
| 4 | Legacy image constraints | `assets/app.js` | Add `max-width: 100%` styling |
| 5 | Add `loading="lazy"` to admin images | `products.tsx` | Add lazy loading attribute |

### Specific Code Changes

#### 1. Catalog Hero Banner (High Priority)
```tsx
// Current (line 59-63)
<img 
  src="/assets/images/karebe_banner.png" 
  alt="Karebe Wines & Spirits" 
  className="w-full h-48 md:h-64 object-cover rounded-b-2xl"
/>

// Recommended
<div className="aspect-[3/1] max-h-64 overflow-hidden rounded-b-2xl">
  <img 
    src="/assets/images/karebe_banner.png" 
    alt="Karebe Wines & Spirits" 
    className="w-full h-full object-cover"
  />
</div>
```

#### 2. Admin Product Grid (High Priority)
```tsx
// Current (line 603-608)
<div className="h-40 bg-gray-100 relative">
  <img src={product.image_url} className="w-full h-full object-cover" />

// Recommended  
<div className="aspect-square bg-gray-100 relative overflow-hidden">
  <img src={product.image_url} className="w-full h-full object-cover" />
```

#### 3. Banner Library Thumbnails (Medium Priority)
```tsx
// Current (line 189-193)
<img src={banner.url} alt={banner.alt} className="w-full h-24 object-cover" />

// Recommended
<div className="aspect-[16/9] overflow-hidden">
  <img src={banner.url} alt={banner.alt} className="w-full h-full object-cover" />
</div>
```

---

## Phase 6: Summary Output

### Inventory Summary

- **Total Image Instances**: 19
- **React Components**: 17
- **Legacy HTML/JS**: 2
- **Unique Patterns**: 6 (Product Thumbnail, User Avatar, Hero Banner, Admin Upload, Gallery, Legacy)

### Sizing Strategies Used

| Strategy | Usage Count |
|----------|-------------|
| Tailwind `aspect-square` | 1 |
| Tailwind fixed pixels | 4 |
| Tailwind responsive | 2 |
| CVA variants | 1 |
| No constraints | 1 |

### Risk Assessment

- **High Risk Areas**: 2 (Hero banner, Admin product grid)
- **Medium Risk Areas**: 2 (Banner thumbnails, Product card expansion)
- **Low Risk Areas**: 3 (Gallery, Cart items, Avatars)

### Quick Wins

1. ✅ Add aspect ratio to hero banner (1 line change + wrapper div)
2. ✅ Fix admin product grid aspect ratio (1 class change)
3. ✅ Standardize banner thumbnail sizing (1 class change)
4. ✅ Add lazy loading to admin images (1 attribute)

### Architecture Recommendations

1. **Create reusable Image component** with consistent sizing props
2. **Document image size requirements** for each context
3. **Consider image optimization** via Supabase image transformations
4. **Add max-width constraints** to prevent over-sized images

---

*Report generated from codebase audit conducted on 2026-03-11*