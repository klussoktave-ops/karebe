# Karebe React - Login Credentials

This document contains the login credentials for the Karebe React system.

## Overview

The system comes pre-seeded with realistic data including:
- **3 Admin Accounts** with different roles
- **22 Products** across 6 categories
- **3 Branches** (Wangige, Karura, City Center)
- **10 Sample Orders** with various statuses
- **5 Delivery Assignments**

---

## Login Credentials

### Super Admin (Owner)
**Full system access** - Manage branches, users, products, and view all reports.

| Field | Value |
|-------|-------|
| **Email** | `admin@karebe.local` |
| **Password** | `adminlemon1234` |
| **Role** | Super Admin |
| **Name** | Admin User |
| **Phone** | +254712345678 |

**Permissions:**
- Full system administration
- Branch management
- User management
- Product catalog management
- View all orders and reports
- System settings

---

### Branch Admin - Wangige
**Branch management** - Manage orders, stock, and riders for assigned branch.

| Field | Value |
|-------|-------|
| **Email** | `wangige@karebe.local` |
| **Password** | `wangigelemon1234` |
| **Role** | Branch Admin |
| **Name** | Wangige Admin |
| **Phone** | +254723456789 |
| **Branch** | Wangige Main |

**Permissions:**
- Manage assigned branch
- Manage branch inventory/stock
- View and manage branch orders
- Assign riders to deliveries
- View branch reports

---

### Branch Admin - Karura
**Branch management** - Manage orders, stock, and riders for assigned branch.

| Field | Value |
|-------|-------|
| **Email** | `karura@karebe.local` |
| **Password** | `karuralemon1234` |
| **Role** | Branch Admin |
| **Name** | Karura Admin |
| **Phone** | +254724567890 |
| **Branch** | Karura Branch |

**Permissions:**
- Manage assigned branch
- Manage branch inventory/stock
- View and manage branch orders
- Assign riders to deliveries
- View branch reports

---

## Demo Data Summary

### Products (22 Total)

#### Whiskey (5 products)
- Johnnie Walker Black Label (750ml, 1L, 375ml)
- Johnnie Walker Blue Label (750ml, 1L) - Premium
- Jack Daniel's Old No. 7 (750ml, 1L)
- Glenfiddich 12 Year Old (750ml)
- Jameson Irish Whiskey (750ml, 1L)

#### Vodka (3 products)
- Absolut Vodka (750ml, 1L)
- Grey Goose Vodka (750ml, 1L) - Premium
- Smirnoff Red Label (750ml, 1L)

#### Gin (3 products)
- Bombay Sapphire Gin (750ml, 1L)
- Tanqueray London Dry Gin (750ml, 1L)
- Hendrick's Gin (750ml) - Craft

#### Wine (5 products)
- Four Cousins Natural Sweet Red (750ml, 1.5L)
- Four Cousins Natural Sweet White (750ml)
- 4th Street Sweet Red (750ml)
- Capel Vale Cabernet Sauvignon (750ml)
- Jacob's Creek Shiraz (750ml)

#### Beer (4 products)
- Tusker Lager (500ml, 330ml can, 6-pack)
- Whitecap Lager (500ml)
- Heineken (500ml, 330ml can)
- Guinness Foreign Extra Stout (500ml)

#### Rum (3 products)
- Captain Morgan Spiced Gold (750ml, 1L)
- Bacardi Carta Blanca (750ml, 1L)
- Havana Club 7 Year Old (750ml)

### Branches (3)
1. **Wangige Main** - Wangige Town Centre, Off Waiyaki Way
2. **Karura Branch** - Karura Shopping Centre, Kiambu Road
3. **City Center** - Moi Avenue, Next to Hilton Hotel

### Orders (10 Sample Orders)
Various order statuses for testing:
- Pending (awaiting payment)
- Confirmed (payment received)
- Processing (being prepared)
- Ready (ready for pickup)
- Out for Delivery
- Delivered
- Cancelled

---

## Demo Features

### Demo Banner
The demo includes a banner component that shows:
- Demo mode indicator
- Quick access to login credentials
- One-click credential copying
- Data reset functionality
- App statistics (products, orders, users)

### Using the Demo Banner

```tsx
import { DemoBanner } from '@/components/demo';

// Full banner with all features
<DemoBanner />

// Or use the credentials card in login pages
import { DemoCredentialsCard } from '@/components/demo';
<DemoCredentialsCard />
```

### Reset Demo Data
To reset all demo data to its original state:
1. Click the "Reset Data" button in the demo banner
2. Confirm the reset action
3. Page will reload with fresh demo data

Or programmatically:
```typescript
import { resetDemoData } from '@/lib/seed';
resetDemoData();
```

---

## Demo Settings

| Setting | Value |
|---------|-------|
| **App Name** | Karebe Wine & Spirits |
| **Currency** | KES (Kenyan Shilling) |
| **Currency Symbol** | KSh |
| **Min Order Amount** | KSh 500 |
| **Delivery Fee Base** | KSh 200 |
| **M-Pesa Paybill** | 123456 |
| **Support Phone** | +254720123456 |
| **Support Email** | support@karebe.com |

---

## Quick Start

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open the app in browser**

3. **The demo data is automatically seeded** on first load

4. **Use any of the credentials above** to log in

5. **Toggle the "Show Logins" button** in the demo banner to see credentials anytime

---

## Product Images

All product images are sourced from Unsplash and are representative placeholder images.

## Notes

- Demo data is stored in browser localStorage
- Clearing browser data will reset the demo
- Use the reset button to restore original demo data
- All prices are in Kenyan Shillings (KES)
- No real payments are processed in demo mode

---

## Support

For issues with the demo system, contact:
- **Email:** support@karebe.com
- **Phone:** +254720123456
