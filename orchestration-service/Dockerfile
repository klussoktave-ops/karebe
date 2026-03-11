# Karebe Orchestration Service - Dockerfile
# Optimized for Railway deployment

# Use Node.js 20 LTS
FROM node:20-alpine AS base
ENV PORT=3001

# Dependencies stage - install ALL deps including dev for build
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
# Install ALL dependencies (ignore production flag for build)
RUN npm install --include=dev

# Build stage - compile TypeScript
FROM deps AS builder
WORKDIR /app

# Copy all config and source files needed for build
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 karebe

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy compiled dist and source
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY tsconfig.json ./

# Switch to non-root user
USER karebe

# Expose port
EXPOSE 3001

# Start the service
CMD ["node", "dist/index.js"]
