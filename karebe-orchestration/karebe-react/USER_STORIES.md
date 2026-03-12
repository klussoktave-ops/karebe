# Karebe User Stories - End-to-End Test Coverage

## Overview
This document defines 20 comprehensive user stories covering all personas and critical user flows in the Karebe Wines & Spirits platform.

---

## Customer Persona (Stories 1-6)

### US-001: Browse Products by Category
**As a** customer  
**I want to** browse products organized by category (Wine, Spirits, Beer)  
**So that** I can easily find the type of alcohol I'm looking for  

**Acceptance Criteria:**
- Customer can view all product categories
- Products are filtered when a category is selected
- Product cards display image, name, price, and availability
- Out-of-stock products are visually indicated

**E2E Test:** `customer/product-browsing.test.ts`

---

### US-002: Search Products by Name
**As a** customer  
**I want to** search for products by name  
**So that** I can quickly find a specific product I want to purchase  

**Acceptance Criteria:**
- Search returns matching products by name (partial match)
- Search handles case-insensitive queries
- Empty results display appropriate message
- Search results update in real-time

**E2E Test:** `customer/product-search.test.ts`

---

### US-003: Add Products to Cart
**As a** customer  
**I want to** add products to my shopping cart  
**So that** I can collect items before checkout  

**Acceptance Criteria:**
- Customer can add products to cart
- Cart persists across page refreshes
- Cart shows item count and total price
- Quantity can be adjusted in cart

**E2E Test:** `customer/cart-management.test.ts`

---

### US-004: Complete M-Pesa Checkout
**As a** customer  
**I want to** pay for my order using M-Pesa  
**So that** I can complete my purchase securely  

**Acceptance Criteria:**
- Customer enters phone number for M-Pesa
- STK push is sent to customer's phone
- Order status updates to PAID after confirmation
- Receipt number is captured and displayed

**E2E Test:** `customer/checkout-flow.test.ts`

---

### US-005: Track Order Status
**As a** customer  
**I want to** track my order status in real-time  
**So that** I know when my delivery will arrive  

**Acceptance Criteria:**
- Customer can view order history
- Order status shows: Pending → Confirmed → Out for Delivery → Delivered
- Rider location updates are visible (if assigned)
- Customer receives WhatsApp notifications on status changes

**E2E Test:** `customer/order-tracking.test.ts`

---

### US-006: Receive Order via Delivery
**As a** customer  
**I want to** receive my order at my specified address  
**So that** I can enjoy my purchase  

**Acceptance Criteria:**
- Delivery address is captured during checkout
- Rider arrives at specified location
- Customer confirms receipt of order
- Order status updates to DELIVERED

**E2E Test:** `customer/delivery-receipt.test.ts`

---

## Admin/Manager Persona (Stories 7-12)

### US-007: Add New Product
**As an** admin  
**I want to** add new products to the catalog  
**So that** customers can purchase them  

**Acceptance Criteria:**
- Admin can enter product details (name, description, price, category)
- Product images can be uploaded
- Stock quantity is set
- Product appears in customer catalog immediately

**E2E Test:** `admin/product-creation.test.ts`

---

### US-008: Update Product Information
**As an** admin  
**I want to** update existing product details  
**So that** information stays current  

**Acceptance Criteria:**
- Admin can edit product name, price, description
- Stock quantity can be adjusted
- Changes reflect immediately in catalog
- Edit history is tracked

**E2E Test:** `admin/product-management.test.ts`

---

### US-009: Manage Order Status
**As an** admin  
**I want to** view and update order statuses  
**So that** I can manage the fulfillment process  

**Acceptance Criteria:**
- Admin sees all orders with filters (Pending, Confirmed, etc.)
- Orders can be confirmed after payment
- Orders can be marked as Ready for Delivery
- Order details show customer info and items

**E2E Test:** `admin/order-management.test.ts`

---

### US-010: Assign Rider to Order
**As an** admin  
**I want to** assign available riders to orders  
**So that** deliveries are fulfilled  

**Acceptance Criteria:**
- Available riders are shown with current status
- Admin can assign rider to specific order
- Rider receives notification via WhatsApp
- Order status updates to OUT_FOR_DELIVERY

**E2E Test:** `admin/rider-assignment.test.ts`

---

### US-011: View Sales Analytics
**As an** admin  
**I want to** view sales reports and analytics  
**So that** I can understand business performance  

**Acceptance Criteria:**
- Dashboard shows total sales, orders, revenue
- Charts display sales trends over time
- Top products are identified
- Data can be filtered by date range

**E2E Test:** `admin/analytics-dashboard.test.ts`

---

### US-012: Manage System Configuration
**As an** admin  
**I want to** configure system settings  
**So that** the platform operates according to business rules  

**Acceptance Criteria:**
- Delivery fees can be configured
- Operating hours can be set
- Notification settings can be adjusted
- System logs are viewable

**E2E Test:** `admin/system-configuration.test.ts`

---

## Rider Persona (Stories 13-16)

### US-013: Accept Delivery Assignment
**As a** rider  
**I want to** accept delivery assignments via WhatsApp  
**So that** I can start fulfilling orders  

**Acceptance Criteria:**
- Rider receives WhatsApp message with order details
- Rider can reply "YES" or "NDIO" to accept
- Order is assigned to rider
- Customer is notified rider is assigned

**E2E Test:** `rider/assignment-acceptance.test.ts`

---

### US-014: Update Location During Delivery
**As a** rider  
**I want to** update my location during delivery  
**So that** the customer knows my progress  

**Acceptance Criteria:**
- Rider can update GPS coordinates
- Location updates are sent to server
- Customer sees rider location on map
- Updates occur at configurable intervals

**E2E Test:** `rider/location-tracking.test.ts`

---

### US-015: Mark Order as Delivered
**As a** rider  
**I want to** mark orders as delivered  
**So that** the system knows completion status  

**Acceptance Criteria:**
- Rider can mark order as delivered via WhatsApp
- Reply options: "DELIVERED", "IMEFIKA", "DONE"
- Order status updates to DELIVERED
- Customer receives delivery confirmation

**E2E Test:** `rider/delivery-completion.test.ts`

---

### US-016: View Delivery History
**As a** rider  
**I want to** view my delivery history  
**So that** I can track my earnings and performance  

**Acceptance Criteria:**
- Rider sees list of completed deliveries
- Each delivery shows date, time, and earnings
- Total earnings are calculated
- Performance metrics are displayed

**E2E Test:** `rider/delivery-history.test.ts`

---

## System/Integration Stories (17-20)

### US-017: Real-time Order Updates
**As the** system  
**I want to** push real-time updates to connected clients  
**So that** all users see current information  

**Acceptance Criteria:**
- WebSocket/Socket.io connection established
- Order status changes broadcast to relevant users
- Updates received within 2 seconds
- Connection reconnects automatically

**E2E Test:** `system/realtime-updates.test.ts`

---

### US-018: M-Pesa Payment Integration
**As the** system  
**I want to** process M-Pesa payments securely  
**So that** customers can pay for orders  

**Acceptance Criteria:**
- STK push sends payment request to customer
- Callback URL receives payment confirmation
- Order status updates automatically on payment
- Failed payments are handled gracefully

**E2E Test:** `system/mpesa-integration.test.ts`

---

### US-019: WhatsApp Notification Delivery
**As the** system  
**I want to** send WhatsApp notifications to customers and riders  
**So that** everyone stays informed  

**Acceptance Criteria:**
- Notifications sent on order confirmation
- Rider assignment notifications delivered
- Delivery completion messages sent
- Failed messages are retried

**E2E Test:** `system/whatsapp-notifications.test.ts`

---

### US-020: Inventory Stock Management
**As the** system  
**I want to** manage product inventory automatically  
**So that** stock levels are accurate  

**Acceptance Criteria:**
- Stock decreases when order is confirmed
- Out-of-stock products cannot be purchased
- Low stock alerts sent to admin
- Stock history is tracked

**E2E Test:** `system/inventory-management.test.ts`

---

## Test Execution Matrix

| Story ID | Test File | Critical Path | Estimated Duration |
|----------|-----------|---------------|-------------------|
| US-001 | customer/product-browsing.test.ts | Yes | 30s |
| US-002 | customer/product-search.test.ts | Yes | 20s |
| US-003 | customer/cart-management.test.ts | Yes | 45s |
| US-004 | customer/checkout-flow.test.ts | Yes | 60s |
| US-005 | customer/order-tracking.test.ts | Yes | 40s |
| US-006 | customer/delivery-receipt.test.ts | Yes | 35s |
| US-007 | admin/product-creation.test.ts | Yes | 50s |
| US-008 | admin/product-management.test.ts | No | 40s |
| US-009 | admin/order-management.test.ts | Yes | 45s |
| US-010 | admin/rider-assignment.test.ts | Yes | 55s |
| US-011 | admin/analytics-dashboard.test.ts | No | 30s |
| US-012 | admin/system-configuration.test.ts | No | 35s |
| US-013 | rider/assignment-acceptance.test.ts | Yes | 40s |
| US-014 | rider/location-tracking.test.ts | Yes | 50s |
| US-015 | rider/delivery-completion.test.ts | Yes | 35s |
| US-016 | rider/delivery-history.test.ts | No | 25s |
| US-017 | system/realtime-updates.test.ts | Yes | 45s |
| US-018 | system/mpesa-integration.test.ts | Yes | 60s |
| US-019 | system/whatsapp-notifications.test.ts | Yes | 50s |
| US-020 | system/inventory-management.test.ts | Yes | 40s |

**Total Estimated Duration:** ~16 minutes (can run in parallel)

---

## Persona Distribution

- **Customer Stories:** 6 (30%)
- **Admin/Manager Stories:** 6 (30%)
- **Rider Stories:** 4 (20%)
- **System/Integration Stories:** 4 (20%)

---

## Critical Path Stories (Must Pass)

1. US-003: Add Products to Cart
2. US-004: Complete M-Pesa Checkout
3. US-007: Add New Product
4. US-009: Manage Order Status
5. US-010: Assign Rider to Order
6. US-013: Accept Delivery Assignment
7. US-015: Mark Order as Delivered
8. US-017: Real-time Order Updates
9. US-018: M-Pesa Payment Integration
10. US-019: WhatsApp Notification Delivery

**Critical Path Coverage:** 50% (10/20 stories)
