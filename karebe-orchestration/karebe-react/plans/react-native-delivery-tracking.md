# Karebe Delivery Tracking React Native App

## Architecture Overview

This document outlines the architecture for a React Native companion app for Karebe delivery tracking.

## Core Features

### 1. Real-Time Location Tracking
- **Purpose**: Track rider location during delivery
- **Technology**: 
  - React Native Geolocation Service
  - Background location updates
  - Battery-optimized tracking (update every 30-60 seconds)
- **Privacy**: 
  - Only active during assigned deliveries
  - Customer can see rider location but not vice versa
  - Location sharing stops after delivery confirmation

### 2. Rider Dashboard
```typescript
interface RiderDashboard {
  activeDeliveries: Delivery[];
  todayStats: {
    completed: number;
    earnings: number;
    rating: number;
  };
  availability: 'online' | 'offline' | 'on_break';
}
```

### 3. Delivery Management
- Accept/reject delivery assignments
- View delivery details (customer, address, items)
- Navigation to customer location (Google Maps/Apple Maps integration)
- Delivery confirmation with:
  - Photo proof
  - Customer signature
  - PIN confirmation

### 4. M-Pesa SMS Receipt Verification
- **Purpose**: Verify customer M-Pesa payments by reading SMS receipts
- **Permissions**: SMS_READ permission on Android
- **Flow**:
  1. Manager/admin opens verification screen
  2. App requests SMS permission
  3. User selects M-Pesa message
  4. App parses transaction details (amount, receipt number, sender)
  5. Verification sent to backend
  6. Order marked as paid
- **Privacy**: Only processes M-Pesa messages, no other SMS stored
- **Fallback**: Manual entry of receipt number

```typescript
interface MpesaSmsData {
  transactionId: string;
  amount: number;
  senderPhone: string;
  timestamp: Date;
  recipientTill: string;
}

// SMS parsing regex patterns
const MPESA_PATTERNS = {
  sent: /Sent to .+ for Ksh([\d,]+\.?\d*)/,
  received: /received Ksh([\d,]+\.?\d*)/,
  confirmation: /Confirmation code: ([A-Z0-9]+)/,
  till: /paid to (.+?)\s/,
};
```

### 5. Offline Support
- Queue actions when offline
- Sync when connection restored
- Local storage of active deliveries
- Offline M-Pesa verification queueing
- Background sync when connection restored

## Technical Stack

### Core
- **Framework**: React Native 0.72+
- **State Management**: Zustand
- **Navigation**: React Navigation v6
- **Maps**: React Native Maps

### Location & Background
- **Location**: React Native Geolocation Service
- **Background Tasks**: React Native Background Fetch
- **Push Notifications**: Firebase Cloud Messaging

### SMS & Communication
- **SMS Reading**: react-native-get-sms-android (Android only)
- **WhatsApp Integration**: WhatsApp Business API via webhooks
- **Deep Links**: react-native-linking for app-to-app communication

### Backend Integration
- **API**: REST API (same as web app)
- **Real-time**: WebSocket for location updates
- **Authentication**: JWT tokens

## Data Flow

```
Rider App → Background Location Service → API → Customer Web App
                ↓
         PostgreSQL + PostGIS
                ↓
         Admin Dashboard (Real-time map)
```

## Location Tracking Flow

1. **Assignment Start**: Rider accepts delivery → Tracking begins
2. **Background Updates**: Location sent every 30s via API
3. **Customer View**: Web app shows rider on map
4. **Delivery Complete**: Tracking stops, confirmation sent

## M-Pesa SMS Verification Flow

```
Manager App → Request SMS Permission → Read M-Pesa Messages
     ↓
Parse Transaction Data (Amount, Receipt, Till)
     ↓
Match with Pending Order
     ↓
Send Verification to Backend
     ↓
Order Marked as Paid
     ↓
WhatsApp Notification to Customer (via Bot)
```

### SMS Permission Handling
```typescript
// Permission request flow
const requestSmsPermission = async () => {
  if (Platform.OS !== 'android') return false;
  
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    {
      title: 'SMS Permission',
      message: 'Karebe needs access to read M-Pesa messages for payment verification',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    }
  );
  
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

// Read SMS messages
const readMpesaMessages = async () => {
  const messages = await SmsAndroid.list(
    JSON.stringify({
      box: 'inbox',
      readState: 0, // unread
      address: 'MPESA',
    }),
    (fail) => console.error(fail),
    (count, smsList) => {
      const messages = JSON.parse(smsList);
      return messages.filter(msg => 
        msg.body.includes('confirmed') && 
        msg.body.includes('Ksh')
      );
    }
  );
  return messages;
};

// Parse M-Pesa message
const parseMpesaMessage = (message: string): MpesaSmsData | null => {
  const amountMatch = message.match(/Ksh([\d,]+\.?\d*)/);
  const codeMatch = message.match(/([A-Z0-9]{10})/);
  const tillMatch = message.match(/paid to (.+?)\s/);
  
  if (!amountMatch || !codeMatch) return null;
  
  return {
    transactionId: codeMatch[1],
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    senderPhone: '', // Extract from message if available
    timestamp: new Date(),
    recipientTill: tillMatch ? tillMatch[1] : '',
  };
};
```

### WhatsApp Bot Integration
When payment is verified via SMS, the WhatsApp bot sends completion notification:
```typescript
const sendCompletionNotification = async (orderId: string, phone: string) => {
  await fetch('/api/whatsapp/send', {
    method: 'POST',
    body: JSON.stringify({
      to: phone,
      template: 'payment_confirmed',
      variables: {
        order_id: orderId,
        amount: orderAmount,
      },
    }),
  });
};
```

## Privacy & Security

- Location data encrypted at rest
- 24-hour retention for completed deliveries
- Riders can disable tracking (affects assignment priority)
- Customers see only assigned rider, not all riders

## Screen Structure

```
App
├── Auth Stack
│   ├── Login
│   └── Forgot Password
├── Main Tabs
│   ├── Home (Dashboard)
│   ├── Deliveries (Active/Pending)
│   ├── Payments (M-Pesa Verification)
│   ├── History (Past deliveries)
│   └── Profile
├── Delivery Stack
│   ├── Delivery Detail
│   ├── Navigation (Map)
│   └── Confirmation
└── Payment Stack
    ├── Payment List (Pending orders)
    ├── SMS Verification
    └── Manual Entry
```

### Payment Verification Screen
```typescript
interface PaymentVerificationScreenProps {
  orderId: string;
  expectedAmount: number;
  customerPhone: string;
}

// Features:
// - Display order summary
// - "Verify via SMS" button → Opens SMS picker
// - "Enter manually" → Receipt number input
// - Show verification status
// - Send WhatsApp confirmation after verification
```

## API Endpoints

```typescript
// Location updates
POST /api/rider/location
{
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  deliveryId?: string;
}

// Get assigned deliveries
GET /api/rider/deliveries?status=active

// Update delivery status
PATCH /api/delivery/:id/status
{
  status: 'picked_up' | 'in_transit' | 'delivered';
  location: { lat: number; lng: number };
  proof?: { type: 'photo' | 'signature'; url: string };
}

// Verify M-Pesa payment via SMS data
POST /api/payments/verify-sms
{
  orderId: string;
  smsData: {
    transactionId: string;
    amount: number;
    senderPhone: string;
    timestamp: string;
  };
  verifiedBy: string; // manager/rider user ID
}

// Get pending payments for verification
GET /api/payments/pending?branch_id=xxx

// Manual receipt verification
POST /api/payments/verify-manual
{
  orderId: string;
  receiptNumber: string;
  amount: number;
  verifiedBy: string;
}
```

## Database Schema (PostgreSQL)

```sql
-- Rider locations table
CREATE TABLE rider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES riders(id),
  delivery_id UUID REFERENCES deliveries(id),
  location GEOGRAPHY(POINT, 4326),
  accuracy FLOAT,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Create index for spatial queries
CREATE INDEX idx_rider_locations_geo ON rider_locations USING GIST(location);
```

## Deployment

- **iOS**: App Store
- **Android**: Google Play Store + APK for Kenya
- **Updates**: CodePush for OTA updates

## Future Enhancements

- Route optimization
- Batch delivery (multiple orders)
- Customer chat
- Delivery time prediction ML
- Fuel/expense tracking
