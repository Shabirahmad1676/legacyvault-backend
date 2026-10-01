require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./src/models');
const apiRouter = require('./src/routes');
const errorHandler = require('./src/middleware/error-handler.middleware');
const { globalLimiter } = require('./src/middleware/rate-limiter.middleware');
const redisClient = require('./src/config/redis');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (AWS ALB, Nginx, Render, Cloudflare, etc.)
app.set('trust proxy', 1);

// Security Headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration

const allowedOrigins = [
  'https://legacyvault-frontend.vercel.app',
];

console.log('🌐 Allowed CORS origins:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log('CORS rejected:', origin);
      return callback(null, false);
    },

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
  })
);


app.use(express.json());
app.use(cookieParser());

// Liveness / Health check endpoint (for AWS ALB, ECS, Docker, Render)
app.get('/health', async (req, res) => {
  let dbStatus = 'connected';
  let redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';

  try {
    await sequelize.authenticate();
  } catch (err) {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
  });
});

// Apply global rate limiter
app.use('/api', globalLimiter);

// Mount main API router
app.use('/api', apiRouter);

// Centralized error handling
app.use(errorHandler);

let server;

// Database connection authentication & Server startup
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection authenticated successfully.');

    // Ensure Redis is connected if available
    try {
      if (process.env.NODE_ENV !== 'test' && !redisClient.isOpen) {
        await redisClient.connect();
      }
    } catch (redisErr) {
      console.warn('⚠️ Redis not available at startup. Rate limiting fallback will be used.');
    }
    
    if (process.env.NODE_ENV !== 'test') {
      server = app.listen(PORT, () => {
        console.log(`🚀 LegacyVault Server running on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error('❌ Startup critical failure:', error.message);
  }
};

// Graceful shutdown handling for zero-downtime deployments
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('🔒 HTTP server closed.');
      try {
        await sequelize.close();
        console.log('🔒 Database connection pool closed.');
        if (redisClient.isOpen) {
          await redisClient.quit();
          console.log('🔒 Redis connection closed.');
        }
      } catch (err) {
        console.error('Error during cleanup:', err.message);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = app;