const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 9004;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Compression middleware
app.use(compression());

// CORS configuration - allow multiple ports for development
const allowedOrigins = [
  'https://pystr.valalav.ru',
  'http://localhost:3000',
  'http://192.168.10.170:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  process.env.CORS_ORIGIN,
  'http://localhost:3003',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Appy API Key Authentication to all /api routes (except explicitly public ones if any)
// Note: We'll modify apiKeyAuth.js to allow public endpoints if needed, or mount specific routes before this.
// For now, secure EVERYTHING under /api/
const { requireApiKey } = require('./middleware/apiKeyAuth');
app.use('/api/', requireApiKey());

// Slow down repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500 // begin adding 500ms of delay per request above 50
});

app.use('/api/', speedLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';

    console.log(`[${logLevel}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);

    if (duration > 5000) {
      console.warn(`⚠️  Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
  });

  next();
});

// Middleware for API key authentication
const { requireApiKey } = require('./middleware/apiKeyAuth');

// Health check endpoint (public)
app.get('/health', async (req, res) => {
  try {
    const matchingService = require('./services/matchingService');
    const health = await matchingService.healthCheck();

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/profiles', require('./routes/profiles'));

// Haplogroup routes (for hierarchical filtering)
app.use('/api/haplogroups', require('./routes/haplogroups'));
// Database routes (haplogroup lists, statistics)
app.use('/api/databases', require('./routes/databases'));

// Sample management routes (with API key auth)
app.use('/api/samples', require('./routes/samples'));

// Admin API keys management (with master key auth) - must be BEFORE /api/admin
app.use('/api/admin/keys', require('./routes/keys'));
// Admin audit log (with master key auth) - must be BEFORE /api/admin
app.use('/api/admin/audit', require('./routes/audit'));
// Admin routes (statistics, maintenance)
app.use('/api/admin', require('./routes/admin'));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);

  // Handle multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      maxSize: process.env.MAX_FILE_SIZE || '100MB'
    });
  }

  // Handle validation errors
  if (error.isJoi) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }

  // Handle database errors
  if (error.code && error.code.startsWith('23')) { // PostgreSQL constraint violations
    return res.status(400).json({
      error: 'Database constraint violation',
      details: error.message
    });
  }

  // Generic error response
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);

  // Close database connections
  try {
    const { pool } = require('./config/database');
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }

  // Close Redis connections
  try {
    const matchingService = require('./services/matchingService');
    await matchingService.redis.quit();
    console.log('✅ Redis connections closed');
  } catch (error) {
    console.error('❌ Error closing Redis:', error.message);
  }

  process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 YSTR Matcher Backend Server Started');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log('---');
  console.log('📊 Endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  POST /api/profiles/find-matches - Find genetic matches');
  console.log('  POST /api/profiles/upload - Upload CSV profiles');
  console.log('  GET  /api/profiles/:kitNumber - Get profile by kit number');
  console.log('  GET  /api/profiles - Search profiles');
  console.log('  GET  /api/profiles/stats/database - Database statistics');
  console.log('---');
});

module.exports = app;