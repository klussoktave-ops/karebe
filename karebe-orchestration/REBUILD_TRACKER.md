# SaaS Rebuild Tracker

Last updated: 2026-03-02 (Africa/Nairobi)
Owner: Codex + User
Objective: Rebuild to a modern, warm, tactile, icon-driven multi-page SaaS UI.

## Status Legend
- `[ ]` Not started
- `[-]` In progress
- `[x]` Completed
- `[!]` Blocked / needs decision

## Phase 0 - Tracking Setup
- [x] Create a persistent rebuild tracker in repo.
- [x] Define phase-by-phase checklist with completion status.
- [x] Add resume notes and immediate next actions.

## Phase 1 - Information Architecture and Routing (No Tabs)
- [x] Remove admin tabs and hidden panels from UI.
- [x] Split admin areas into separate pages/routes:
  - [x] `admin.html` (Dashboard)
  - [x] `admin-catalog.html` (Catalog list/search)
  - [x] `admin-product-new.html` (Add product)
  - [x] `admin-orders.html` (Orders)
  - [x] `admin-delivery.html` (Delivery/Riders)
  - [x] `admin-system.html` (System/Branch/Tills/Managers)
- [x] Update top navigation and admin navigation links.
- [x] Ensure each page has independent header/content/empty states.

## Phase 2 - Visual System Reset (Warm, Premium, Tactile)
- [x] Define new warm design tokens (color, spacing, radii, shadows, motion).
- [x] Replace flat visual style with layered cards/surfaces.
- [x] Add icon-supported navigation and action patterns.
- [x] Implement tactile interactions:
  - [x] Hover lift
  - [x] Press animation
  - [x] Focus glow (accessible)
  - [x] Disabled states
- [x] Add page fade transitions and subtle micro-motion.
- [x] Move toast notifications to top-right and style consistently.

## Phase 3 - Customer Experience Rebuild
- [x] Restructure catalog page for calmer hierarchy.
- [x] Keep product cards focused on primary action: Add.
- [x] Keep communication methods only in checkout method selection.
- [x] Create tactile quantity selector behavior.
- [x] Add sticky cart summary with clear iconography.
- [x] Build guided checkout method cards.
- [x] Improve customer empty states with clear CTA text.

## Phase 4 - Admin Experience Rebuild
- [-] Dashboard page:
  - [x] KPI cards, warm visual hierarchy, quick actions.
- [x] Catalog page:
  - [x] Searchable table with icons.
  - [x] Clickable product rows.
- [x] Add Product page:
  - [x] Sectioned form groups.
  - [x] Labels + microcopy + friendly validation states.
- [-] Orders page:
  - [x] Status badges in warm tones.
  - [x] Expandable/clickable row details.
- [-] Delivery page:
  - [x] Styled assignment controls.
  - [x] Status progression button group with icons.
- [-] System page:
  - [x] Shift, branches, managers, tills in clear card groups.

## Phase 5 - Rider Experience Rebuild
- [x] Upgrade rider page visual language to match SaaS theme.
- [x] Improve assigned job cards and status update affordance.
- [x] Improve delivery history readability and empty states.

## Phase 6 - Accessibility and Interaction Quality
- [x] Ensure all form fields use labels (not placeholder-only).
- [x] Ensure keyboard-visible focus states across controls.
- [-] Ensure color contrast for text/badges/actions.
- [x] Ensure interaction feedback is inline/toast (no blocking popups).
- [x] Ensure no reload-based UX interruptions.

## Phase 7 - Verification and Handover
- [x] Run `node --check assets/app.js`.
- [x] Run `npm test`.
- [ ] Manual pass:
  - [ ] Customer flow
  - [ ] Admin login + role behavior
  - [ ] Catalog/product creation
  - [ ] Order + delivery assignment flow
  - [ ] Rider login + status progression
- [ ] Final before/after summary in tracker.

---

## Work Log

### 2026-03-02
- [x] Initialized tracker with complete rebuild scope and checklist.
- [x] Captured current baseline: working tree is clean (`git status --short` returned no changes).
- [x] Replaced `admin.html` with dedicated Dashboard page layout.
- [x] Added new admin route files:
  - `admin-catalog.html`
  - `admin-product-new.html`
  - `admin-orders.html`
  - `admin-delivery.html`
  - `admin-system.html`
- [-] Began tab-removal migration: markup split complete, JS routing/logic refactor still pending.
- [x] Updated `assets/app.js` router to support all `admin-*` pages.
- [x] Removed legacy tab activation logic from `assets/app.js`.
- [x] Added element-guarded admin rendering to avoid cross-page null-ID crashes.
- [x] Validation pass:
  - `node --check assets/app.js`
  - `npm test` (100/100 passing)
- [-] Styling is still using legacy classes for new route shells; visual reset is pending.
- [x] Current files touched this cycle:
  - `admin.html`
  - `admin-catalog.html`
  - `admin-product-new.html`
  - `admin-orders.html`
  - `admin-delivery.html`
  - `admin-system.html`
  - `assets/app.js`
  - `REBUILD_TRACKER.md`
- [x] Added route-specific admin interactions in `assets/app.js`:
  - Catalog clickable rows with selected-product detail card.
  - Orders expandable row details with payment badges.
  - Delivery status progression controls with step-forward enforcement.
- [x] Added tactile admin interaction styles in `assets/styles.css`:
  - Card hover lift, button hover lift, selected row states.
  - Order detail surface styling and delivery status step group styling.
- [x] Validation pass after interaction updates:
  - `node --check assets/app.js`
  - `npm test` (100/100 passing)
- [x] Confirmed default test credentials source for QA:
  - `karebe-owner / karebeowner1234` (super-admin)
  - `karebe / karebe1234` (branch admin)
  - `dante / dante1234` (branch admin)
- [x] Updated admin route pages with icon entities and labeled login forms:
  - `admin.html`
  - `admin-catalog.html`
  - `admin-product-new.html`
  - `admin-orders.html`
  - `admin-delivery.html`
  - `admin-system.html`
- [x] Added inline test credential hint on admin login screens (`karebe / karebe1234`).
- [x] Validation pass after icon + form-label updates:
  - `node --check assets/app.js`
  - `npm test` (100/100 passing)
- [x] Rebuilt customer page structure in `index.html`:
  - Added 2-column layout with sticky checkout rail.
  - Added guided checkout method cards (M-Pesa, Call, SMS, WhatsApp).
  - Removed fragmented cart action buttons in favor of one primary action.
  - Added clearer form labels, context cards, and calmer content rhythm.
- [x] Updated customer behavior logic in `assets/app.js`:
  - Added `CUSTOMER_CHECKOUT_METHOD_KEY` state handling.
  - Added method-card selection with one primary checkout CTA.
  - Kept branch contact channels available only through checkout method selection.
- [x] Rebuilt rider page structure in `rider.html`:
  - Added rider hero, KPI cards, map card, and grouped workflow sections.
  - Added labeled login inputs and default rider test hint.
- [x] Updated rider interactions in `assets/app.js`:
  - Added active/completed counters.
  - Improved assigned job card affordance and status action clarity.
- [x] Added warm customer/rider visual system styles in `assets/styles.css`:
  - Warm page tokens, sticky checkout, method card states, product quantity affordance.
  - Rider workflow styling, responsive behavior, and tactile interactions.
- [x] Validation pass after customer+rider rebuild:
  - `node --check assets/app.js`
  - `npm test` (100/100 passing)
- [x] Completed admin form labeling/microcopy pass:
  - `admin-delivery.html` (rider + assignment form labels and helper text)
  - `admin-system.html` (shift, branch, manager, till form labels and helper text)
  - `admin-catalog.html` (search label and helper text)
  - `rider.html` (PIN field typed as password)
- [x] Validation pass after form/accessibility updates:
  - `node --check assets/app.js`
  - `npm test` (100/100 passing)
- [x] Completed admin catalog iconized table rows:
  - Added icon column in `admin-catalog.html`.
  - Added category-based icon rendering in `assets/app.js`.
  - Added icon chip styling in `assets/styles.css`.
- [x] Validation pass after catalog icon updates:
  - `node --check assets/app.js`
  - `npm test` (100/100 passing)
- [x] Completed Add Product inline validation improvements:
  - Added field-level invalid styling (`.field-invalid`) in `assets/styles.css`.
  - Added inline validation checks and focused feedback in `assets/app.js` (`productForm`).
  - Preserved upload flow and sync behavior after validation pass.
- [x] Validation pass after Add Product validation updates:
  - `node --check assets/app.js`
  - `npm test` (100/100 passing)
- [x] Applied full dark urban design system pass:
  - Added global color tokens (deep charcoal + neon accents) and spacing tokens.
  - Added sticky glass navbar treatment and stronger visual hierarchy.
  - Unified customer/admin/rider surfaces, cards, buttons, forms, and badges under one theme.
  - Added dark table refinements and mobile table-to-card responsive behavior.
  - Added reduced-motion support and stronger focus/hover glow feedback patterns.
- [x] Added supporting behavior updates in `assets/app.js`:
  - Responsive table label hydration for mobile table cards.
  - Cart count badge bump animation trigger.
  - Customer checkout method CTA persistence and interaction polish.
- [x] Validation pass after urban-system updates:
  - `node --check assets/app.js`
  - `npm test` (100/100 passing)

## Resume Notes
- Current phase: **Phase 6 + Phase 7 (in progress)**.
- Next concrete action:
  1. Run manual end-to-end UX pass for customer/admin/rider flows and log any interaction regressions.
  2. Tweak any low-contrast spots discovered during manual QA.
  3. Produce final before-vs-after summary and close Phase 7 handover checklist.

## Files Planned for Major Changes
- `assets/styles.css`
- `assets/app.js`
- `index.html`
- `rider.html`
- `admin.html`
- New files:
  - `admin-catalog.html`
  - `admin-product-new.html`
  - `admin-orders.html`
  - `admin-delivery.html`
  - `admin-system.html`
