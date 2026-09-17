const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize } = require('./src/models');
const apiRouter = require('./src/routes');
const errorHandler = require('./src/middleware/error-handler.middleware');
const { globalLimiter } = require('./src/middleware/rate-limiter.middleware');
const redisClient = require('./src/config/redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Docker / Nginx environments
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowedPatterns = [
      /^http:\/\/localhost:[0-9]+$/,
      /^http:\/\/127\.0\.0\.1:[0-9]+$/,
      process.env.FRONTEND_URL
    ];
    const isAllowed = !origin || allowedPatterns.some(pattern => 
      typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
    );
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Apply global rate limiter
app.use('/api', globalLimiter);

app.use('/api', apiRouter);
app.use(errorHandler);

// Database connection authentication only (No runtime sync!)
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
      app.listen(PORT, () => {
        console.log(`🚀 LegacyVault Server running on http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error('❌ Startup critical failure:', error.message);
    process.exit(1);
  }
};

startServer();
module.exports = app;