// =============================================================================
// Karebe Orchestration Service
// Main entry point
// =============================================================================

// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { logger } from './lib/logger';
import { testConnection } from './lib/supabase';

import orderRoutes from './routes/orders';
import webhookRoutes from './routes/webhook';
import riderRoutes from './routes/riders';
import adminRoutes from './routes/admin';
import whatsappParserRoutes from './routes/whatsapp-parser';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// =============================================================================
// Middleware
// =============================================================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// =============================================================================
// Routes
// =============================================================================

app.use('/api/orders', orderRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappParserRoutes);

// Health check
app.get('/health', async (_req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: dbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Root
app.get('/', (_req, res) => {
  res.json({
    service: 'Karebe Orchestration Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      orders: '/api/orders',
      webhook: '/api/webhook',
      health: '/health',
    },
  });
});

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// =============================================================================
// Server Startup
// =============================================================================

async function startServer() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Orchestration Service running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
startServer();