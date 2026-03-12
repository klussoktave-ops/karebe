# Karebe Orchestration Service - Code Sync Plan

## Executive Summary

This document outlines the plan to synchronize code between the local development copy and the Railway deployment repository (`karebe/karebe-orchestration`), while preserving all recent changes and ensuring the Railway deployment works correctly.

---

## Current Architecture

### Git Repository Structure

```
GitHub: karebe/karebe-orchestration  ──► Railway Deployment (PRODUCTION)
                                    │
                                    └── Serves: karebe-orchestration-production.up.railway.app

GitHub: karebe/karebe-react         ──► Vercel Deployment
                                    │
                                    └── Serves: karebe-lemon.vercel.app
```

### Local Workspace Structure

```
/home/lenovo/projects/karebe/                      # Local git repo root
├── orchestration-service/                          # API (root level - LOCAL DEV ONLY)
│   ├── railway.json                                # ⚠️ NOT used by Railway
│   ├── Dockerfile
│   └── src/                                        # Express API code
│
├── karebe-orchestration/                           # Railway repo (SHOULD MATCH GitHub)
│   ├── vercel.json                                 # Frontend config
│   ├── index.html, admin.html...                   # Legacy static files
│   ├── karebe-orchestration/                      # NESTED: Express API
│   │   ├── Dockerfile                              # No railway.json
│   │   └── src/                                    # Has pricingRoutes + paymentRoutes
│   │
│   ├── orchestration-service/                      # NESTED: Express API copy
│   │   ├── railway.json                            # Has railway.json ⚠️
│   │   ├── Dockerfile                              # Production optimized
│   │   └── src/                                    # Missing pricingRoutes
│   │
│   └── karebe-react/                               # NESTED: Frontend
│
└── karebe-react/                                   # Frontend (root level)
```

---

## Root Cause Analysis

### Why Railway Serves Static HTML Instead of JSON

1. **No railway.json at `karebe-orchestration/` root** - Railway looks here first
2. **Nested API folders not detected** - Railway doesn't recursively search for Dockerfile
3. **Static fallback kicks in** - When no build found, Railway serves static files

### Code Comparison Summary

| Feature | `orchestration-service/` (root) | `karebe-orchestration/karebe-orchestration/` | `karebe-orchestration/orchestration-service/` |
|---------|--------------------------------|---------------------------------------------|---------------------------------------------|
| railway.json | ✅ Yes | ❌ No | ✅ Yes |
| Dockerfile | Basic | Basic | Production (healthcheck) |
| pricingRoutes | ✅ Yes | ✅ Yes | ❌ No |
| paymentRoutes | ✅ Yes | ✅ Yes | ❌ No |
| rateLimiter | ❌ No | ❌ No | ✅ Yes |
| CORS config | Specific origins | All origins | Specific origin |

---

## Synchronization Plan

### Phase 1: Identify Most Recent Code

**Winner: `karebe-orchestration/karebe-orchestration/`**
- Has `pricingRoutes` and `paymentRoutes` (latest features)
- More complete API implementation

### Phase 2: Synchronization Steps

#### Step 1: Update Railway Repo Configuration
Add `railway.json` to `karebe-orchestration/` root pointing to the correct API:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfile": "karebe-orchestration/Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckPort": 3001
  }
}
```

#### Step 2: Merge API Code
Copy the most recent `src/` from `karebe-orchestration/karebe-orchestration/` to both:
- `karebe-orchestration/orchestration-service/src/` (for Railway)
- `orchestration-service/src/` (for local dev)

#### Step 3: Add Missing Dependencies
Ensure `karebe-orchestration/orchestration-service/package.json` has:
- `pricingRoutes`
- `paymentRoutes`

#### Step 4: Create Production Dockerfile
Place a production Dockerfile at `karebe-orchestration/Dockerfile`:

```dockerfile
# Karebe Orchestration Service - Production Dockerfile
FROM node:20-alpine AS base
ENV NODE_ENV=production PORT=3001

# Dependencies
FROM base AS deps
WORKDIR /app
COPY karebe-orchestration/package.json karebe-orchestration/package-lock.json* ./
RUN npm ci --only=production

# Builder
FROM base AS builder
WORKDIR /app
COPY karebe-orchestration/package.json karebe-orchestration/package-lock.json* ./
RUN npm ci
COPY karebe-orchestration/tsconfig.json ./
COPY karebe-orchestration/src ./src
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 karebe
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY karebe-orchestration/package.json ./
COPY karebe-orchestration/tsconfig.json ./
USER karebe
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## Files to Update

| File | Action | Source |
|------|--------|--------|
| `karebe-orchestration/railway.json` | Create | New config for Railway |
| `karebe-orchestration/Dockerfile` | Create | Production optimized |
| `karebe-orchestration/orchestration-service/src/` | Update | Copy from `karebe-orchestration/karebe-orchestration/src/` |
| `karebe-orchestration/orchestration-service/package.json` | Update | Add pricing + payment deps |
| `orchestration-service/src/` | Update | Sync with Railway version |

---

## Deployment Verification

After applying changes:

1. **Railway Build**: Check Railway dashboard for successful build
2. **Health Check**: `curl https://karebe-orchestration-production.up.railway.app/health`
3. **API Test**: `curl https://karebe-orchestration-production.up.railway.app/api/orders?status=ORDER_SUBMITTED`

Expected response should be JSON, not HTML.

---

## Risk Mitigation

- **Backup**: Create git tag before making changes
- **Rollback**: Railway retains deployment history
- **Testing**: Test locally first with `npm run dev`
- **Zero-downtime**: Railway handles blue-green deployment