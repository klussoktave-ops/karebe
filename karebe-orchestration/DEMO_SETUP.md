# Local Demo Setup - Multi-Role Testing

Test the complete order flow with 3 different browsers/incognito windows.

## Architecture for Local Testing

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CUSTOMER      │     │     MANAGER      │     │     RIDER       │
│   (Chrome)      │     │   (Firefox)      │     │   (Safari)      │
│                 │     │                  │     │                 │
│  karebe-react   │────▶│  karebe-react    │────▶│  WhatsApp Web  │
│  (port 5173)    │     │  (port 5173)     │     │  (or portal)   │
└────────┬────────┘     └────────┬─────────┘     └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌───────────────────────┐
         │  Orchestration Service │
         │       (port 3001)      │
         └───────────┬───────────┘
                     ▼
         ┌───────────────────────┐
         │       Supabase        │
         │   (cloud or local)    │
         └───────────────────────┘
```

## Prerequisites

1. **Supabase project** (free tier works fine)
2. **Node.js 18+**
3. **3 different browsers** (Chrome, Firefox, Safari) or incognito windows

## Step 1: Setup Database

1. Go to your Supabase project SQL Editor
2. Run the migration: [`orchestration-service/src/database/migrations/001_orchestration_schema.sql`](orchestration-service/src/database/migrations/001_orchestration_schema.sql)
3. Verify tables created:
   - `order_state_transitions`
   - `rider_availability`
   - `order_locks`
   - `webhook_events`

## Step 2: Seed Demo Data

In Supabase SQL Editor, run:

```sql
-- Create demo branch
INSERT INTO branches (id, name, address, phone) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Main Branch', '123 Test St, Nairobi', '+254712345678')
ON CONFLICT DO NOTHING;

-- Create demo products
INSERT INTO products (id, name, description, price, category_id, stock_quantity) 
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'Red Wine', 'Fine red wine', 1500, '33333333-3333-3333-3333-333333333333', 100),
  ('44444444-4444-4444-4444-444444444444', 'Whiskey', 'Premium whiskey', 2500, '33333333-3333-3333-3333-333333333333', 50)
ON CONFLICT DO NOTHING;

-- Create demo users (customer, manager, rider)
-- Note: Create these via Supabase Auth UI or API, then get their UUIDs

-- Create rider profile
INSERT INTO riders (id, user_id, full_name, phone, branch_id, is_active)
VALUES ('55555555-5555-5555-5555-555555555555', 'RIDER_USER_ID', 'John Rider', '+254798765432', '11111111-1111-1111-1111-111111111111', true)
ON CONFLICT DO NOTHING;

-- Initialize rider availability
INSERT INTO rider_availability (rider_id, status, phone_number, whatsapp_number)
VALUES ('55555555-5555-5555-5555-555555555555', 'AVAILABLE', '+254798765432', '+254798765432')
ON CONFLICT DO NOTHING;
```

## Step 3: Configure Environment

### Frontend (karebe-react/.env.local)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ORCHESTRATION_API_URL=http://localhost:3001
```

### Backend (orchestration-service/.env)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=debug
```

## Step 4: Start Services

### Terminal 1: Start Orchestration Service

```bash
cd orchestration-service
npm install
npm run dev
# Should start on http://localhost:3001
```

### Terminal 2: Start React Frontend

```bash
cd karebe-react
npm install
npm run dev
# Should start on http://localhost:5173
```

## Step 5: Open Browsers

### Browser 1: Customer (Chrome Regular Window)

1. Open http://localhost:5173
2. This is the **Customer Catalog** - no login required
3. Browse products, add to cart

### Browser 2: Manager (Firefox or Chrome Incognito)

1. Open http://localhost:5173/admin
2. Login as manager
3. This is the **Admin Dashboard**

### Browser 3: Rider (Another Incognito Window)

**Option A - Rider Portal:**
1. Open http://localhost:5173/rider
2. Login as rider

**Option B - WhatsApp Web (if configured):**
1. Open web.whatsapp.com
2. Use rider's phone to scan QR

## Step 6: Test the Flow

### Scenario 1: Basic Call Button Flow

1. **Customer** (Browser 1):
   - Add items to cart
   - Click "Call to Order"
   - See order confirmation with ID
   - Phone dialer opens (can cancel)

2. **Manager** (Browser 2):
   - Refresh orders list
   - See new order in "ORDER_SUBMITTED" status
   - Click order to view details
   - Click "Confirm Order" → status changes to "CONFIRMED_BY_MANAGER"
   - Select rider from dropdown
   - Click "Assign & Call" → status changes to "DELIVERY_REQUEST_STARTED"

3. **Manager** (manual confirmation):
   - Call rider on phone
   - Rider confirms verbally
   - Click "Mark as Confirmed" → status changes to "RIDER_CONFIRMED_MANUAL"

4. **Rider** (Browser 3 or phone):
   - See assigned order
   - Click "Start Delivery" → status changes to "OUT_FOR_DELIVERY"
   - Click "Complete Delivery" → status changes to "DELIVERED"

### Scenario 2: WhatsApp Digital Confirmation

1. **Customer**: Create order (same as above)

2. **Manager**: Assign rider (same as above)

3. **Rider** (WhatsApp):
   - Receives message: "New order assigned. Reply YES to confirm"
   - Reply "YES"
   - System automatically updates order to "RIDER_CONFIRMED_DIGITAL"

4. **Manager**:
   - Sees order auto-confirmed
   - No manual action needed

### Scenario 3: Race Condition Test

1. **Manager** (Browser 2):
   - Open order details
   - Start editing (this acquires a lock)

2. **Manager** (Browser 2 - another tab):
   - Try to edit same order
   - Should see "Order locked by another session"

3. **Rider** (WhatsApp):
   - Reply "YES" to confirm
   - System processes confirmation but respects manager's lock

## Step 7: Verify Audit Trail

1. **Manager** (Browser 2):
   - Go to order details
   - Click "View History"
   - See complete timeline:
     ```
     14:30:22 - ORDER_SUBMITTED (by customer)
     14:32:15 - CONFIRMED_BY_MANAGER (by manager@example.com)
     14:33:00 - DELIVERY_REQUEST_STARTED (by manager@example.com)
     14:35:45 - RIDER_CONFIRMED_MANUAL (by manager@example.com)
     14:40:10 - OUT_FOR_DELIVERY (by rider)
     14:55:33 - DELIVERED (by rider)
     ```

## Troubleshooting

### Orders not appearing
- Check Supabase RLS policies
- Verify branch_id matches
- Check browser console for errors

### Status updates failing
- Check orchestration service logs
- Verify state transition is valid
- Check for race condition errors

### WhatsApp not working
- Webhook integration is optional for testing
- Manual confirmation works without WhatsApp

## API Testing with curl

```bash
# Create order
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_phone": "254712345678",
    "customer_name": "Test Customer",
    "delivery_address": "123 Test St, Nairobi",
    "branch_id": "11111111-1111-1111-1111-111111111111",
    "items": [{
      "product_id": "22222222-2222-2222-2222-222222222222",
      "product_name": "Red Wine",
      "quantity": 2,
      "unit_price": 1500
    }],
    "trigger_source": "call_button"
  }'

# Get orders by status
curl "http://localhost:3001/api/orders?status=ORDER_SUBMITTED"

# Assign rider
curl -X POST http://localhost:3001/api/orders/ORDER_ID/assign-rider \
  -H "Content-Type: application/json" \
  -d '{
    "rider_id": "55555555-5555-5555-5555-555555555555",
    "admin_id": "MANAGER_USER_ID"
  }'

# Confirm rider manually
curl -X POST http://localhost:3001/api/orders/ORDER_ID/confirm-rider \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation_method": "MANUAL",
    "actor_type": "admin",
    "actor_id": "MANAGER_USER_ID"
  }'

# Get order history
curl http://localhost:3001/api/orders/ORDER_ID/history
```

## Demo Checklist

- [ ] Customer can add items to cart
- [ ] Customer can click "Call to Order"
- [ ] Order appears in ORDER_SUBMITTED status
- [ ] Manager can confirm order
- [ ] Manager can assign rider
- [ ] Rider receives assignment
- [ ] Rider can confirm (digital or manual)
- [ ] Rider can mark out for delivery
- [ ] Rider can mark delivered
- [ ] Audit trail shows all transitions
- [ ] Race conditions are prevented
- [ ] No duplicate orders created

Happy testing! 🎉
