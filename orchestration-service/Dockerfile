# Karebe Orchestration Service - Dockerfile
# Optimized for Railway deployment

# Use Node.js 20 LTS
FROM node:20-alpine AS base
ENV NODE_ENV=production \
    PORT=3001

# Dependencies stage
FROM base AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build stage
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 karebe

# Copy built artifacts and production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/webhook/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Switch to non-root user
USER karebe

# Expose port
EXPOSE 3001

# Start the service
CMD ["node", "dist/index.js"]
