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
- [-] Implement tactile interactions:
  - [x] Hover lift
  - [x] Press animation
  - [x] Focus glow (accessible)
  - [x] Disabled states
- [x] Add page fade transitions and subtle micro-motion.
- [x] Move toast notifications to top-right and style consistently.

## Phase 3 - Customer Experience Rebuild
- [ ] Restructure catalog page for calmer hierarchy.
- [ ] Keep product cards focused on primary action: Add.
- [ ] Keep communication methods only in checkout method selection.
- [ ] Create tactile quantity selector behavior.
- [ ] Add sticky cart summary with clear iconography.
- [ ] Build guided checkout method cards.
- [ ] Improve customer empty states with clear CTA text.

## Phase 4 - Admin Experience Rebuild
- [-] Dashboard page:
  - [x] KPI cards, warm visual hierarchy, quick actions.
- [-] Catalog page:
  - [ ] Searchable table with icons.
  - [x] Clickable product rows.
- [-] Add Product page:
  - [x] Sectioned form groups.
  - [-] Labels + microcopy + friendly validation states.
- [-] Orders page:
  - [x] Status badges in warm tones.
  - [x] Expandable/clickable row details.
- [-] Delivery page:
  - [x] Styled assignment controls.
  - [x] Status progression button group with icons.
- [-] System page:
  - [x] Shift, branches, managers, tills in clear card groups.

## Phase 5 - Rider Experience Rebuild
- [ ] Upgrade rider page visual language to match SaaS theme.
- [ ] Improve assigned job cards and status update affordance.
- [ ] Improve delivery history readability and empty states.

## Phase 6 - Accessibility and Interaction Quality
- [ ] Ensure all form fields use labels (not placeholder-only).
- [ ] Ensure keyboard-visible focus states across controls.
- [ ] Ensure color contrast for text/badges/actions.
- [ ] Ensure interaction feedback is inline/toast (no blocking popups).
- [ ] Ensure no reload-based UX interruptions.

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

## Resume Notes
- Current phase: **Phase 2 + Phase 4 (in progress)**.
- Next concrete action:
  1. Upgrade Add Product and Delivery forms with clearer persistent labels + microcopy on all fields (remove any placeholder-only fields).
  2. Rebuild customer page visual structure (sticky cart, calmer hierarchy, checkout method cards only).
  3. Rebuild rider page visuals to match warm SaaS system and improve status-action affordance.

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
