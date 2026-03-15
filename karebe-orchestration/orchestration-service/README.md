# Karebe Orchestration Service

Hybrid WhatsApp-First Order Orchestration System for multi-branch wines & spirits delivery platform.

## Overview

This service handles the complete order lifecycle from cart submission through delivery completion, supporting both manual phone-call workflows and automated WhatsApp-based confirmations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED ORCHESTRATION BRAIN                   │
├─────────────────────────────────────────────────────────────────┤
│  Customer → mautrix → Matrix → Automation Service → Supabase    │
│  ↓                                                              │
│  Logical role facades:                                          │
│  - CustomerBot (order creation)                                 │
│  - RiderBot (confirmation, status updates)                      │
│  - ManagerBot (notifications, oversight)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Order State Machine (9 States)

```
CART_DRAFT → ORDER_SUBMITTED → CONFIRMED_BY_MANAGER → DELIVERY_REQUEST_STARTED
                                    ↓
              ┌───────────────────────┴───────────────────────┐
              ↓                                                   ↓
    RIDER_CONFIRMED_DIGITAL                      RIDER_CONFIRMED_MANUAL
              └───────────────────────┬───────────────────────┘
                                      ↓
                            OUT_FOR_DELIVERY → DELIVERED
```

### Hybrid Confirmation

- **Digital**: Rider confirms via WhatsApp bot keywords (YES, CONFIRM, NDIO)
- **Manual**: Admin marks confirmation after phone call
- **Reconciliation**: System handles both safely with idempotency

### Race Condition Protection

- Order locks for concurrent edits
- Idempotency keys for duplicate prevention
- Optimistic locking with version fields
- Database-level state transition validation

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase project
- (Optional) Matrix + mautrix-whatsapp for automation

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run database migrations
# (Execute SQL in src/database/migrations/001_orchestration_schema.sql in Supabase SQL Editor)

# Start development server
npm run dev

# Run tests
npm test
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t karebe-orchestration .
docker run -p 3001:3001 --env-file .env karebe-orchestration
```

## API Endpoints

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create order (call button) |
| GET | `/api/orders` | Get orders by status |
| GET | `/api/orders/:id` | Get order by ID |
| PATCH | `/api/orders/:id/status` | Update order status |
| POST | `/api/orders/:id/assign-rider` | Assign rider to order |
| POST | `/api/orders/:id/confirm-rider` | Confirm rider (digital/manual) |
| POST | `/api/orders/:id/start-delivery` | Mark as out for delivery |
| POST | `/api/orders/:id/complete` | Mark as delivered |
| POST | `/api/orders/:id/cancel` | Cancel order |
| GET | `/api/orders/:id/history` | Get audit trail |

### Riders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/riders` | Get all riders |
| GET | `/api/riders/available` | Get available riders |
| GET | `/api/riders/:id` | Get rider by ID |
| GET | `/api/riders/:id/orders` | Get rider's orders |
| PATCH | `/api/riders/:id/availability` | Update availability |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard summary |
| GET | `/api/admin/audit-log` | Recent audit log entries |
| GET | `/api/admin/webhook-events` | Recent webhook events |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook/mautrix` | Receive mautrix-whatsapp events |
| GET | `/api/webhook/health` | Health check |

## State Machine

### Valid Transitions

| From | To | Allowed Actors | Requires Lock |
|------|-----|----------------|---------------|
| CART_DRAFT | ORDER_SUBMITTED | customer, system | No |
| ORDER_SUBMITTED | CONFIRMED_BY_MANAGER | admin | Yes |
| CONFIRMED_BY_MANAGER | DELIVERY_REQUEST_STARTED | admin | Yes |
| DELIVERY_REQUEST_STARTED | RIDER_CONFIRMED_DIGITAL | rider, webhook | Yes |
| DELIVERY_REQUEST_STARTED | RIDER_CONFIRMED_MANUAL | admin | Yes |
| RIDER_CONFIRMED_* | OUT_FOR_DELIVERY | rider, webhook, admin | Yes |
| OUT_FOR_DELIVERY | DELIVERED | rider, webhook, admin | No |

## Webhook Integration (mautrix-whatsapp)

### Supported Keywords

**Rider Actions:**
- `YES`, `CONFIRM`, `ACCEPT`, `OK`, `NDIO`, `SAWA` → Confirm delivery
- `NO`, `REJECT`, `DECLINE`, `HAPANA` → Reject/return order
- `DELIVERED`, `DONE`, `COMPLETE`, `IMEFIKA` → Mark delivered
- `START`, `OMW`, `OTW`, `ON MY WAY`, `NAENDA` → Start delivery

### Webhook Payload Format

```json
{
  "event_id": "unique-event-id",
  "room_id": "!room:matrix.example.com",
  "sender": "@whatsapp_254712345678:matrix.example.com",
  "content": {
    "body": "YES",
    "msgtype": "m.text"
  },
  "timestamp": 1709500800000
}
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing with cURL

```bash
# Create order
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_phone": "254712345678",
    "delivery_address": "123 Test St, Nairobi",
    "branch_id": "550e8400-e29b-41d4-a716-446655440000",
    "items": [{
      "product_id": "550e8400-e29b-41d4-a716-446655440001",
      "product_name": "Test Wine",
      "quantity": 1,
      "unit_price": 1500
    }],
    "trigger_source": "call_button"
  }'

# Assign rider
curl -X POST http://localhost:3001/api/orders/ORDER_ID/assign-rider \
  -H "Content-Type: application/json" \
  -d '{
    "rider_id": "550e8400-e29b-41d4-a716-446655440002",
    "admin_id": "550e8400-e29b-41d4-a716-446655440003"
  }'
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `PORT` | Server port (default: 3001) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `LOG_LEVEL` | Log level (debug/info/warn/error) | No |
| `MAUTRIX_WEBHOOK_SECRET` | Secret for webhook validation | For WhatsApp |
| `FRONTEND_URL` | Frontend URL for CORS | No |

## Database Schema

Key tables added by migration:

- `order_state_transitions` - Audit log for all state changes
- `rider_availability` - Real-time rider status tracking
- `order_locks` - Concurrent edit prevention
- `webhook_events` - Idempotency and debugging
- `valid_state_transitions` - State machine rules

## License

MIT