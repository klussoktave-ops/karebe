# Karebe Railway Deployment Guide

This guide covers deploying the Karebe orchestration service to Railway with all app components working.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Railway    │    │   Railway    │    │   Vercel     │      │
│  │ Orchestration│    │  (Reserved)  │    │   Frontend   │      │
│  │  Service     │    │  Database    │    │   (React)    │      │
│  │   :3001      │    │   (RDS?)     │    │              │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                    │                    │               │
│         └────────────────────┼────────────────────┘               │
│                              │                                    │
│                              ▼                                    │
│                   ┌─────────────────────┐                        │
│                   │     Supabase        │                        │
│                   │   (Database + Auth) │                        │
│                   │ pwcqgwpkvesoowpnomad │                        │
│                   └─────────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Current Supabase Configuration

**Already configured:**
- URL: `https://pwcqgwpkvesoowpnomad.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## Step 1: Deploy Orchestration Service to Railway

### Option A: Deploy from GitHub

1. **Push**
   ```bash code to GitHub
   cd orchestration-service
   git init
   git add .
   git commit -m "Initial commit"
   # Create repo on GitHub and push
   ```

2. **Deploy to Railway**
   - Go to [Railway.app](https://railway.app)
   - Sign up/Login with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select the repository
   - Configure environment variables:

   ```env
   SUPABASE_URL=https://pwcqgwpkvesoowpnomad.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3Y3Fnd3BrdmVzb293cG5vbWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzM1MzgsImV4cCI6MjA4NTk0OTUzOH0.3Jh6K44juFscozoNFqhVD0rBMwcpOdTzrs-XhrWJv0o
   PORT=3001
   NODE_ENV=production
   LOG_LEVEL=info
   FRONTEND_URL=https://your-app.vercel.app
   ```

3. **Deploy**

### Option B: Deploy from CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set SUPABASE_URL=https://pwcqgwpkvesoowpnomad.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-key
railway variables set SUPABASE_ANON_KEY=your-anon-key
railway variables set PORT=3001
railway variables set NODE_ENV=production

# Deploy
railway up
```

---

## Step 2: Get Service Role Key from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `pwcqgwpkvesoowpnomad`
3. Go to **Settings** → **API**
4. Copy the **Service Role Key** (NOT the anon key)
5. Add it to Railway variables

---

## Step 3: Update Frontend Environment

After Railway deployment, update the frontend to use the orchestration service:

1. **Update `karebe-react/.env`**:
   ```
   VITE_ORCHESTRATION_URL=https://your-railway-app.up.railway.app
   ```

2. **Update API calls in frontend** to use orchestration service:
   - Order creation → Railway
   - Rider management → Railway
   - Admin operations → Railway

---

## Step 4: Run Database Migrations

The orchestration service requires additional tables. Run the migration:

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy content from `orchestration-service/supabase/migrations/20240303000000_orchestration_schema.sql`
3. Execute

---

## Step 5: Verify Deployment

### Health Check
```bash
curl https://your-railway-app.up.railway.app/api/health
```

### Test Orders Endpoint
```bash
curl https://your-railway-app.up.railway.app/api/orders
```

---

## Step 6: Vercel Frontend Deployment

Deploy the React frontend to Vercel (keeps existing API routes):

```bash
cd karebe-react
vercel deploy --prod
```

Or connect GitHub repo in Vercel dashboard.

---

## Environment Variables Summary

### Railway (Orchestration Service)
| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://pwcqgwpkvesoowpnomad.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(from Supabase Settings → API)* |
| `SUPABASE_ANON_KEY` | *(from Supabase Settings → API)* |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |

### Vercel (Frontend)
| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://pwcqgwpkvesoowpnomad.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(from Supabase Settings → API)* |
| `VITE_ORCHESTRATION_URL` | `https://your-railway-app.up.railway.app` |

---

## API Endpoints Available After Deployment

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | List orders |
| GET | `/api/orders/:id` | Get order |
| PATCH | `/api/orders/:id/status` | Update status |
| POST | `/api/orders/:id/assign-rider` | Assign rider |
| POST | `/api/orders/:id/complete` | Mark delivered |

### Riders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/riders` | List riders |
| GET | `/api/riders/available` | Available riders |
| GET | `/api/riders/:id` | Get rider |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard |

---

## Troubleshooting

### CORS Issues
If frontend can't reach orchestration service, add CORS config in Railway:
```env
CORS_ORIGIN=https://your-app.vercel.app
```

### Database Connection
Ensure SERVICE_ROLE_KEY has correct permissions in Supabase.

### Health Check
```bash
# Railway health endpoint
curl https://your-railway-app.up.railway.app/api/webhook/health
```

---

## What's Working After Deployment

| Feature | Status | Location |
|---------|--------|----------|
| Frontend (React) | ✅ | Vercel |
| Supabase Database | ✅ | Supabase |
| Auth | ✅ | Supabase |
| Products CRUD | ✅ | Vercel API routes |
| Cart | ✅ | Vercel API routes |
| Checkout | ✅ | Vercel API routes |
| Orders API | ✅ | Railway |
| Rider Management | ✅ | Railway |
| Admin Dashboard | ✅ | Railway |
| WhatsApp Webhooks | ✅ | Railway |

---

## Next Steps

1. **Deploy orchestration service to Railway**
2. **Update frontend environment variables**
3. **Test end-to-end order flow**
4. **Configure custom domain** (optional)