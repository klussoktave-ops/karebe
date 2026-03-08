# Shopping Cart UX Refactoring Plan

## Overview
Improve cart discoverability, avoid UI overlap issues, and enhance the checkout experience for a React + Tailwind ecommerce application (wine & spirits shop).

---

## Current State Analysis

### 1. Cart Navigation
- **Current**: Catalog page has cart button that calls `toggleCart()` opening a drawer
- **Problem**: No scroll-to-cart behavior; users don't know where cart is

### 2. FAB vs Modal Z-Index
- **Current**: FAB uses `z-40`, FloatingCartSummary uses `z-60`
- **Problem**: Modal can still overlap with FAB; positioning not optimized

### 3. Cart Item UI
- **Current**: Already has product images (40-56px in compact mode), name, price
- **Problem**: Could be improved with better layout consistency

---

## Implementation Tasks

### TASK 1: Add Scroll-to-Cart Functionality with Highlight Animation

**Goal**: When user clicks header cart button, smoothly scroll to cart section and highlight it.

**Implementation Steps**:
1. Add a `cartSectionRef` (React ref) to the cart container in the catalog page
2. Create `scrollToCart()` function using `scrollIntoView({ behavior: "smooth" })`
3. Add CSS animation class for highlight/pulse effect (subtle glow animation)
4. Modify cart button to call scroll function instead of/in addition to toggleCart
5. Ensure keyboard accessibility (tabindex, aria attributes)

**Files to Modify**:
- `karebe-react/src/pages/customer/catalog.tsx` - Add ref and scroll function
- `karebe-react/src/index.css` - Add highlight animation

**Key Code Patterns**:
```tsx
// Ref setup
const cartSectionRef = useRef<HTMLDivElement>(null);

// Scroll function
const scrollToCart = () => {
  cartSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
};

// CSS animation (add to index.css)
@keyframes cart-highlight {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3); }
}
.animate-cart-highlight {
  animation: cart-highlight 1s ease-in-out 2;
}
```

---

### TASK 2: Fix FAB and FloatingCartSummary Z-Index and Positioning

**Goal**: Ensure modal appears on opposite side of FAB and has higher z-index.

**Implementation Steps**:
1. Verify z-index values (FAB: 40 → Modal: 60+) - ensure clear separation
2. Position modal on opposite side:
   - Desktop: FAB at bottom-right, Modal at bottom-left
   - Mobile: Stack vertically with proper spacing
3. Add safe margins from screen edges
4. Prevent overlap with proper z-index stacking

**Files to Modify**:
- `karebe-react/src/components/cart/floating-cart-summary.tsx` - Update positioning
- `karebe-react/src/components/layout/floating-actions.tsx` - Update z-index

**Key Changes**:
```tsx
// FloatingCartSummary positioning
className={`fixed bottom-24 left-4 md:left-4 md:right-auto z-60 ...`}

// FloatingActions positioning  
className={`fixed bottom-4 right-4 z-40 ...`}
```

---

### TASK 3: Improve Cart Item UI in Cart Page

**Goal**: Each cart item displays image, name, size, quantity, price in compact horizontal layout.

**Implementation Steps**:
1. Ensure image thumbnail: 40-56px, square, object-fit cover, rounded corners
2. Display product name and size/variant clearly
3. Quantity controls with +/- buttons
4. Price prominently displayed
5. Test responsive behavior on mobile

**Files to Modify**:
- `karebe-react/src/features/cart/components/cart-item.tsx` - Improve layout
- `karebe-react/src/features/cart/components/cart-summary.tsx` - Review styling

**Layout Pattern**:
```
[image]  Product Name (Size)
         Qty: [-] 1 [+]
         Price: KES X,XXX
```

---

## UX Goals Summary

The cart experience should feel:
- **Fast**: Quick interactions, minimal loading
- **Clear**: Obvious cart location, item details visible
- **Visually Anchored**: Fixed position elements always accessible
- **Impossible to Lose**: Always know where cart is, what was added, how to checkout

---

## Files Summary

| File | Changes |
|------|---------|
| `src/pages/customer/catalog.tsx` | Add cart section ref, scroll function |
| `src/index.css` | Add highlight animation |
| `src/components/cart/floating-cart-summary.tsx` | Update positioning/z-index |
| `src/components/layout/floating-actions.tsx` | Update z-index |
| `src/features/cart/components/cart-item.tsx` | Improve compact layout |

---

## Testing Checklist

- [ ] Click header cart → smooth scroll to cart section
- [ ] Cart section shows highlight animation on scroll
- [ ] Keyboard navigation works (Tab key reaches cart)
- [ ] FAB and modal don't overlap on desktop
- [ ] FAB and modal don't overlap on mobile
- [ ] Cart items show all required info (image, name, size, qty, price)
- [ ] Responsive layout works on all screen sizes