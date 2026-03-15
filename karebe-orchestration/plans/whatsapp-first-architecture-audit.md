# Karebe Wines & Spirits — Hybrid WhatsApp-First Architecture Audit

> **Date:** 2026-03-03  
> **Architect:** Principal Systems Architect  
> **Objective:** Production-readiness audit for hybrid phone-call + WhatsApp orchestration system

---

## EXECUTIVE SUMMARY

**Verdict:** The existing React frontend is production-ready for hybrid dispatch with minor modifications. The critical gaps are backend orchestration, state machine enforcement, and audit trail logging—not UI work.

**Architecture Decision:** Unified orchestration brain with role-based facades. Manual phone workflows preserved. Digital confirmations additive, not replacement.

**Infrastructure:** Single VPS ($12-20/month) with Matrix + mautrix-whatsapp bridge. No Kubernetes. No serverless complexity.

**Timeline:** 6-8 weeks to full hybrid automation.

---

## PHASE 1 — SYSTEM INVENTORY & COMPONENT CLASSIFICATION

### 1.1 Current System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CURRENT SYSTEM (As-Is)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   CUSTOMER                          ADMIN                           RIDER│
│   ┌──────────────┐                  ┌──────────────┐              ┌─────┐│
│   │  React App   │                  │  React Admin │              │Phone││
│   │  (Working)   │                  │  (Working)   │              │/WApp││
│   └──────┬───────┘                  └──────┬───────┘              └──┬──┘│
│          │                                  │                         │   │
│          │  ┌─────────────────────────────────────────────────────┐  │   │
│          │  │                                                       │  │   │
│          └──►│                    SUPABASE                          │◄─┘   │
│             │  (PostgreSQL + RLS + Triggers)                        │      │
│             │                                                       │      │
│             │  Tables: orders, order_items, products,               │      │
│             │          branches, riders, profiles                   │      │
│             │                                                       │      │
│             │  ⚠️ Missing: order_audit_log, rider_availability      │      │
│             │  ⚠️ Missing: confirmation_type enum                   │      │
│             │  ⚠️ Missing: state transition validation              │      │
│             └───────────────────────────────────────────────────────┘      │
│                                                                          │
│   VERCEL API FUNCTIONS:                                                  │
│   • products.js — Product CRUD ✅                                        │
│   • cart.js — Session cart management ✅                                 │
│   • orders.js — Basic order CRUD ⚠️ (no state machine)                   │
│   • delivery.js — Rider assignment ⚠️ (no availability check)            │
│                                                                          │
│   LEGACY WORKFLOWS (Still Active):                                       │
│   • Phone call → Staff writes in book → Manual system entry              │
│   • WhatsApp message → Staff reads → Manual order creation               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Classification Matrix

| Component | Status | Classification | Production-Ready? | Blockers |
|-----------|--------|----------------|-------------------|----------|
| **Customer React Frontend** | ✅ Working | Production-Ready | **YES** — with modifications | Need: Call-triggered submission, ORDER_SUBMITTED state handling |
| **Admin React Frontend** | ✅ Working | Production-Ready | **YES** — with modifications | Need: Rider dropdown + call icon, audit trail view, state timeline |
| **Rider Portal (React)** | ✅ Working | Limited Use | Partial | Smart riders only; phone-based riders bypass entirely |
| **Supabase Schema** | ⚠️ Partial | Needs Extension | NO | Missing: audit_log table, confirmation_type, state validation |
| **Supabase RLS** | ✅ Working | Production-Ready | YES | Policies correctly enforce role-based access |
| **Vercel API Functions** | ⚠️ Partial | Prototype | NO | Missing: state machine logic, idempotency, race condition handling |
| **Order State Machine** | ❌ Missing | Conceptual | NO | Currently string status; no transition rules |
| **Audit Trail** | ❌ Missing | Conceptual | NO | No logging of who changed what when |
| **WhatsApp Integration** | ❌ Missing | Conceptual | NO | No automation layer |
| **Matrix/mautrix** | ❌ Missing | Conceptual | NO | Messaging backbone absent |
| **Orchestration Brain** | ❌ Missing | Conceptual | NO | No unified automation service |
| **Rider Availability** | ❌ Missing | Conceptual | NO | No presence tracking |

### 1.3 Frontend Readiness for Hybrid Dispatch

#### ✅ Customer Frontend — PRODUCTION READY (with 2 additions)

**Current Capabilities:**
- Product catalog with search and filters
- Cart management with persistent storage
- Variant selection (size/type)
- Branch selection
- Guest checkout (no signup required)

**Required Modifications (2-3 days):**

1. **Call Button Auto-Submit**
   - Customer clicks "Call" → order draft submitted
   - State: ORDER_SUBMITTED
   - Shows visible confirmation with order number
   - Then opens phone dialer

2. **Cart Reassurance**
   - Show "Your cart is saved" message after call
   - Display order reference number prominently

**Verdict:** Customer frontend is 95% ready. Just needs call-triggered submission.

#### ⚠️ Admin Frontend — NEEDS 4 MODIFICATIONS

**Current Capabilities:**
- Order list with status filtering
- Product management
- Rider list view
- Basic order detail view

**Required Modifications (1 week):**

1. **Rider Assignment Dropdown** — List available riders, show phone icon, click updates state
2. **Audit Trail Panel** — Timeline view showing who did what when
3. **Dual Confirmation Support** — Button for manual confirmation, auto-update for digital
4. **Race Condition Warnings** — Real-time lock indicators, conflict detection

**Verdict:** Admin frontend needs significant work for audit visibility and race condition handling.

#### ⚠️ Rider Portal — LIMITED UTILITY

**Reality Check:** Only smartphone-enabled riders will use this. Majority will continue via phone/WhatsApp. Portal becomes optional, not required.

**Decision:** Keep portal for digital-native riders, but build entire flow assuming riders may NEVER use it.

---

## PHASE 2 — ORDER STATE MACHINE & HYBRID WORKFLOWS

### 2.1 Required State Machine (9 States)

```
CART_DRAFT
    ↓ [Customer clicks "Call"]
ORDER_SUBMITTED
    ↓ [Manager reviews call]
CONFIRMED_BY_MANAGER
    ↓ [Admin assigns rider + clicks call icon]
DELIVERY_REQUEST_STARTED
    ├──────┐
    ↓      ↓
RIDER_CONFIRMED_DIGITAL    RIDER_CONFIRMED_MANUAL
    └──────┬───────────────┘
           ↓
    OUT_FOR_DELIVERY
           ↓
      DELIVERED
```

**States:**
1. **CART_DRAFT** — Customer building cart
2. **ORDER_SUBMITTED** — Call triggered, draft submitted
3. **CONFIRMED_BY_MANAGER** — Manager confirmed inventory
4. **DELIVERY_REQUEST_STARTED** — Admin assigned rider, calling
5. **RIDER_CONFIRMED_DIGITAL** — Rider confirmed via WhatsApp
6. **RIDER_CONFIRMED_MANUAL** — Admin marked confirmed after phone
7. **OUT_FOR_DELIVERY** — Rider has item, delivering
8. **DELIVERED** — Customer received order
9. **CANCELLED** — Order cancelled

### 2.2 State Transition Rules (WITH RACE CONDITION PROTECTION)

```typescript
const validTransitions = {
  CART_DRAFT: ['ORDER_SUBMITTED', 'CANCELLED'],
  ORDER_SUBMITTED: ['CONFIRMED_BY_MANAGER', 'CANCELLED'],
  CONFIRMED_BY_MANAGER: ['DELIVERY_REQUEST_STARTED', 'CANCELLED'],
  DELIVERY_REQUEST_STARTED: ['RIDER_CONFIRMED_DIGITAL', 'RIDER_CONFIRMED_MANUAL', 'CANCELLED'],
  RIDER_CONFIRMED_DIGITAL: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  RIDER_CONFIRMED_MANUAL: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
};
```

### 2.3 Database Schema Additions Required

```sql
-- Extend orders table
ALTER TABLE orders ADD COLUMN confirmation_method VARCHAR(20);
ALTER TABLE orders ADD COLUMN confirmation_by UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN confirmation_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN last_actor_type VARCHAR(20);
ALTER TABLE orders ADD COLUMN last_actor_id UUID;

-- Audit log table (CRITICAL)
CREATE TABLE order_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  actor_type VARCHAR(20) NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  action VARCHAR(100) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Rider availability tracking
CREATE TABLE rider_availability (
  rider_id UUID PRIMARY KEY REFERENCES riders(id),
  status VARCHAR(20) DEFAULT 'AVAILABLE',
  current_order_id UUID REFERENCES orders(id),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Order locks for race condition prevention
CREATE TABLE order_locks (
  order_id UUID PRIMARY KEY REFERENCES orders(id),
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);
```

---

## PHASE 3 — RACE CONDITION ANALYSIS

### 3.1 Identified Race Conditions & Mitigations

| ID | Race Condition | Scenario | Mitigation |
|----|---------------|----------|------------|
| RC-1 | Double confirmation | Admin confirms after rider digital confirmation | State check before update; idempotent |
| RC-2 | Concurrent edits | Two admins edit same order | Optimistic locking with expected_current_status |
| RC-3 | Rider decline | Rider declines after admin marks confirmed | Timeout + escalation; re-assignment flow |
| RC-4 | Duplicate calls | Multiple call events triggered | Idempotency key (order_id + timestamp hash) |
| RC-5 | Double booking | Rider assigned to two orders | Rider availability lock; current_order_id check |
| RC-6 | Cancel conflict | Customer cancels while admin confirming | State validation; restrict cancel by status |
| RC-7 | Stale UI | Network lag shows old state | Real-time subscriptions; version checks |

### 3.2 Locking Strategy

```typescript
async function updateOrderWithLock(
  orderId: string,
  expectedStatus: OrderStatus,
  updateFn: () => Promise<void>
) {
  // 1. Acquire advisory lock
  const locked = await supabase.rpc('acquire_order_lock', {
    p_order_id: orderId,
    p_admin_id: currentAdmin.id
  });
  
  if (!locked) throw new Error('Order being edited by another admin');
  
  try {
    // 2. Verify current status
    const order = await getOrder(orderId);
    if (order.status !== expectedStatus) {
      throw new Error(`Race condition: expected ${expectedStatus}, found ${order.status}`);
    }
    
    // 3. Execute update
    await updateFn();
  } finally {
    // 4. Release lock
    await supabase.rpc('release_order_lock', { p_order_id: orderId });
  }
}
```

---

## PHASE 4 — MESSAGING & ORCHESTRATION ARCHITECTURE

### 4.1 Unified Orchestration Brain (Recommended)

**Decision:** Single orchestration service with role-based facades. NOT multiple separate bots.

**Why:** Shared business logic, consistent state management, easier testing, single deployment.

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED ORCHESTRATION BRAIN                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Matrix Homeserver (Synapse)                 │   │
│   │   Customer/Rider/Manager WhatsApp → Matrix room         │   │
│   └────────────────────────┬────────────────────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │          ORCHESTRATION SERVICE (Node.js)                 │   │
│   │                                                          │   │
│   │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│   │   │CustomerFacade│ │ RiderFacade  │ │ManagerFacade │    │   │
│   │   └──────┬───────┘ └──────┬───────┘ └──────┬───────┘    │   │
│   │          │                │                │             │   │
│   │          └────────────────┼────────────────┘             │   │
│   │                           ▼                              │   │
│   │              ┌────────────────────────┐                  │   │
│   │              │    SHARED SERVICES     │                  │   │
│   │              │  State Machine         │                  │   │
│   │              │  Order Service         │                  │   │
│   │              │  Rider Dispatch        │                  │   │
│   │              │  Audit Logger          │                  │   │
│   │              └───────────┬────────────┘                  │   │
│   └──────────────────────────┼────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                        SUPABASE                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Manual + Digital Reconciliation

```typescript
class ConfirmationReconciler {
  async handleDigitalConfirmation(orderId: string, riderId: string) {
    const order = await getOrder(orderId);
    
    if (order.status === 'RIDER_CONFIRMED_MANUAL') {
      // Already confirmed manually — log and return
      await auditLog.log(orderId, 'DIGITAL_CONFIRM_DUPLICATE', {
        note: 'Rider confirmed digitally but admin already marked manual'
      });
      return { status: 'already_confirmed', method: 'MANUAL' };
    }
    
    return await transitionState(orderId, 'RIDER_CONFIRMED_DIGITAL');
  }
  
  async handleManualConfirmation(orderId: string, adminId: string) {
    const order = await getOrder(orderId);
    
    if (order.status === 'RIDER_CONFIRMED_DIGITAL') {
      await auditLog.log(orderId, 'MANUAL_CONFIRM_REDUNDANT', {
        note: 'Admin marked manual but rider already confirmed digitally'
      });
      return { status: 'already_confirmed', method: 'DIGITAL' };
    }
    
    return await transitionState(orderId, 'RIDER_CONFIRMED_MANUAL');
  }
}
```

---

## PHASE 5 — DISPATCH & RIDER MODEL

### 5.1 Cooperative Rider System

**Critical Decision:** Riders are cooperative employees, NOT gig workers.

**Dispatch Model:**
1. Round-robin assignment (fair distribution)
2. Manual override always available
3. Phone-first, digital optional
4. Single order per rider (V1)

### 5.2 Double Assignment Prevention

```sql
CREATE OR REPLACE FUNCTION assign_rider_to_order(
  p_order_id UUID,
  p_rider_id UUID,
  p_admin_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_rider_status VARCHAR;
BEGIN
  -- Check rider availability with lock
  SELECT status INTO v_rider_status
  FROM rider_availability
  WHERE rider_id = p_rider_id
  FOR UPDATE;
  
  IF v_rider_status != 'AVAILABLE' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rider not available');
  END IF;
  
  -- Assign rider
  UPDATE orders SET rider_id = p_rider_id, status = 'DELIVERY_REQUEST_STARTED'
  WHERE id = p_order_id;
  
  -- Mark rider as on delivery
  UPDATE rider_availability 
  SET status = 'ON_DELIVERY', current_order_id = p_order_id
  WHERE rider_id = p_rider_id;
  
  -- Log
  INSERT INTO order_audit_log (order_id, action, actor_type, actor_id, metadata)
  VALUES (p_order_id, 'RIDER_ASSIGNED', 'admin', p_admin_id,
          jsonb_build_object('rider_id', p_rider_id));
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

---

## PHASE 6 — GAP ANALYSIS SUMMARY

| Category | Critical | High | Medium |
|----------|----------|------|--------|
| **Frontend** | Call auto-submit, ORDER_SUBMITTED handling | Admin audit trail, order locks | SMS confirmations |
| **Backend** | State machine, Audit log, Confirmation enum | Rider availability, Lock mechanism | Inventory reservation |
| **Database** | audit_log table, rider_availability, State RPC | Indexes, Archive | Analytics views |
| **Messaging** | Matrix + mautrix, Orchestration service | Message templates, Retry logic | Rich media |
| **Order Flow** | 9-state machine, Race conditions, Reconciliation | Timeouts, Cancellations | Modifications |
| **Dispatch** | Double-assignment prevention, Rider tracking | Round-robin, Load balancing | ETA estimation |
| **Operations** | Training materials, Runbooks | Monitoring, Alerts | Reporting |

---

## PHASE 7 — INFRASTRUCTURE & COST

### 7.1 Single VPS Deployment

**Recommended:** Hetzner CX31 or DigitalOcean Droplet (4 vCPU, 8GB RAM, 160GB SSD)

**Monthly Cost: $12-20**

**Docker Compose Stack:**
- Synapse (Matrix homeserver)
- mautrix-whatsapp (bridge)
- Orchestration service
- PostgreSQL

### 7.2 Why NOT Serverless

| Factor | Serverless | VPS |
|--------|-----------|-----|
| Cold starts | 500ms-2s | Zero |
| WebSockets | Complex | Native |
| Cost | $100+/mo | $20/mo |
| DevOps | High | Low |
| Matrix bridge | Painful | Straightforward |

---

## PHASE 8 — LEAN EVOLUTION PLAN

### Phase 1 — Structured Submission Layer (Weeks 1-2)

**Goal:** Preserve 100% manual workflow, add structure.

**Deliverables:**
1. Call auto-submit (customer clicks Call → ORDER_SUBMITTED)
2. Structured WhatsApp summary to manager
3. Basic admin audit trail v1

**No automation yet.** Just logging and customer reassurance.

### Phase 2 — Assisted Orchestration (Weeks 3-6)

**Goal:** Deploy Matrix + mautrix, automation brain, hybrid confirmation.

**Deliverables:**
1. VPS with Docker Compose (Synapse + mautrix)
2. Automation brain v1 (receives WhatsApp, updates state)
3. Hybrid confirmation (digital + manual, both logged)
4. Manager WhatsApp notifications

**Still manual dispatch.** Automation assists, doesn't replace.

### Phase 3 — Quiet Full Automation (Weeks 7-8)

**Goal:** Minimal manager intervention, round-robin dispatch.

**Deliverables:**
1. Auto-dispatch (round-robin, escalate unassigned only)
2. Intelligent timeouts (10 min rider timeout)
3. Strong state enforcement (API-level validation)
4. Failure recovery (auto-reassign, crash recovery)

---

## WHAT NOT TO BUILD

1. ❌ Competitive bidding (riders are employees)
2. ❌ Complex AI/NLP (keywords sufficient)
3. ❌ Native rider apps (WhatsApp universal)
4. ❌ GPS real-time tracking (SMS sufficient for V1)
5. ❌ Multi-language (English + Swahili only)
6. ❌ Loyalty program (defer to Phase 3+)
7. ❌ Microservices (single orchestration service)

---

## CRITICAL BLIND SPOTS & RISKS

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| WhatsApp ban | Medium | CRITICAL | Secondary number, SMS fallback, manual backup |
| Staff resistance | High | HIGH | Involve in design, training, manual override always |
| Friday rush overload | High | MEDIUM | Queue system, manager escalation, disable auto-dispatch |
| Network instability | High | MEDIUM | SMS fallback, retry logic |
| Fraudulent orders | Medium | HIGH | Phone verification, max order limits |
| Order modifications | Medium | MEDIUM | Allow until OUT_FOR_DELIVERY, version tracking |
| Prank orders | Medium | MEDIUM | Phone callback required, address verification |

---

## IMMEDIATE NEXT STEPS (This Week)

1. **Schema Migration** — Add audit_log, rider_availability tables
2. **Call Auto-Submit** — Modify customer frontend (2 days)
3. **Admin Audit View** — Add timeline panel (3 days)
4. **State Machine RPC** — Build transition validation (2 days)
5. **VPS Procurement** — Order Hetzner/DigitalOcean ($12-20/month)
6. **Team Alignment** — Review audit, get buy-in on phone-first approach

---

## DIRECT ANSWERS TO CRITICAL QUESTIONS

### 1. Is the current frontend truly production-ready for hybrid dispatch?

**YES**, with 2-3 days of modifications:
- ✅ Product catalog, cart, checkout: Ready
- ✅ Guest checkout (no signup): Ready
- ⚠️ Call-triggered submission: Needs implementation
- ⚠️ Admin audit trail: Needs implementation

### 2. What exact components are missing for orchestration?

| Component | Effort |
|-----------|--------|
| Matrix + mautrix | 2 days |
| Orchestration service | 1 week |
| State machine validation | 3 days |
| Audit logging | 2 days |
| Rider availability | 2 days |
| Race condition handling | 3 days |

**Total: 3-4 weeks**

### 3. Where will race conditions occur?

1. Two admins editing same order → Optimistic locking
2. Admin confirms after rider digital → Idempotency check
3. Rider assigned to two orders → Availability lock
4. Duplicate call events → Idempotency keys

### 4. How should manual and digital confirmation coexist safely?

**Unified reconciler service:**
- Checks state before any transition
- Logs all attempts
- Returns clear status ("already confirmed by X")
- Never overwrites; only transitions forward

### 5. Is unified orchestration brain superior to multiple bots?

**YES.** Single codebase, shared logic, consistent state, easier testing, single deployment.

### 6. What is the minimal infrastructure needed to ship?

**Phase 1:** Existing Vercel + Supabase + schema migrations

**Phase 2:** Single VPS ($12-20/month) + Docker Compose

**No Kubernetes. No serverless. No microservices.**

---

**Decision:** Proceed with Phase 1 immediately (call auto-submit + audit logging). Prepare VPS for Phase 2 deployment next week.

**Philosophy:** Preserve phone-call culture. Absorb complexity into backend. Design for limited tech literacy. Optimize for Kenya connectivity.
