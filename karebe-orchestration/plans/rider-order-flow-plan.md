# Rider Order Flow - Plan

## Current State Analysis

### Demo Login Credentials
- **Rider Login**: `wangige@karebe.local` / `wangigelemon1234`
- **Name**: Peter Ochieng
- **Phone**: +254711000111

Note: "John Rider" doesn't exist in current demo - need to add

### Issue: Orders Not Working
Looking at the logs:
```
[RiderAPI] Response status: 200 
[RiderAPI] Raw response: {"success":true,"data":[]}
[RiderAPI] Orders fetched: 0
```

The rider is logged in but gets **zero orders** because:
1. Orders are not being assigned to rider IDs properly, OR
2. Demo data doesn't link riders to orders with proper IDs

### Feature Already Exists
The order card in [`orders.tsx`](karebe-react/src/pages/admin/orders.tsx:408) already shows:
- ✅ Rider name when assigned (line 414-416)
- ✅ Rider phone number (line 421-422)
- ✅ Call button (line 425-431)
- ✅ WhatsApp button (line 432-440) - carries order payload
- ✅ SMS button (line 441-447) - carries order payload

## Implementation Plan

### 1. Add "John Rider" Demo Data
- Add rider user with proper Supabase UUID
- Ensure orders have proper rider_id linking

### 2. Fix Order Assignment Flow
- Verify assignRider API properly stores rider_id in orders
- Ensure rider can see assigned orders

### 3. Add E2E Tests
- Test rider assignment from admin
- Test rider viewing assigned orders
- Test WhatsApp/SMS/Call actions

## Files to Modify
1. `karebe-react/src/features/orders/api/admin-orders.ts` - Demo orders with rider links
2. `karebe-react/src/__tests__/e2e/user-stories.test.ts` - Add rider flow tests