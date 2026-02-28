# Feature Progress Note

## Completed Features
- Customer catalog available without login (`index.html`).
- Product filtering by category, max price, popular, and new arrival.
- Product cards show image, price, volume, description, availability state.
- One-tap order actions: phone call (`tel:`), SMS prefill, WhatsApp prefill.
- Customer profiles with seeded cart/order history and active profile selection.
- Order card flow: selectable cart items accumulate into checkout card.
- Daraja payment infrastructure seeded (tills + checkout metadata, mock STK flow).
- Admin secure login gate (session-based in-browser auth for MVP).
- Super-admin(owner) + branch admin model with branch shift routing.
- Admin can add product (name, image URL, category, volume, price, stock, flags).
- Admin can delete products.
- Admin can toggle stock availability quickly.
- Admin can add and view riders.
- Admin can log call-based orders (customer phone, item, qty, payment state).
- Inventory stock automatically reduces on order creation.
- Admin can assign unassigned orders to riders.
- Rider login with phone + PIN (seeded or admin-added riders).
- Rider can update delivery status flow: ASSIGNED -> PICKED_UP -> ON_THE_WAY -> DELIVERED.
- Delivery timestamps are recorded in timeline per status change.
- Order logs and delivery logs are visible in admin dashboard.
- KPI summary cards for today/7-day/30-day revenue and active deliveries.
- Basic top products and rider performance insights.
- Shared dark premium UI theme with mobile-first responsive layout.
- Local persistence via `localStorage` for data continuity during MVP usage.

## Incomplete Features (Mini Tasks)
- Proper backend/API and real database (currently browser storage only).
- Strong auth hardening (JWT, refresh tokens, password hashing, MFA).
- Role-based access control on server side.
- Real image upload pipeline (currently URL input only).
- Proper live Daraja integration with secure credentials and callback verification (currently mock flow).
- Advanced analytics (time series charts, cohort views, CSV export).
- Admin filters for logs by date/rider/product/revenue ranges.
- Production payment integrations hardening (webhooks, retries, reconciliation).
- Age verification / 18+ compliance workflow.
- Push notifications and automated SMS notifications.
- Multi-branch support and branch-level stock routing.
- Low-level performance features (service worker offline shell, API caching strategy).
- Automated test suite and CI checks.
- Internationalization and accessibility audit pass.

## Notes
- This MVP is intentionally dependency-free and runs as static files for fast local validation.
- Super-admin(owner) credentials: `karebe-owner / karebeowner1234`.
- Branch admin credentials: `karebe / karebe1234`, `dante / dante1234`.
- Seed rider credentials:
  - `+254711000111 / 1111`
  - `+254722000222 / 2222`
