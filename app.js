require('dotenv').config(); // Absolute first line execution

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize } = require('./src/models');
const apiRouter = require('./src/routes');
const errorHandler = require('./src/middleware/error-handler.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
origin: (origin, callback) => {
  // 1. Filter out undefined variables (like if .env is missing)
  const allowedPatterns = [
    /^http:\/\/localhost:[0-9]+$/,
    /^http:\/\/127\.0\.0\.1:[0-9]+$/,
    process.env.FRONTEND_URL
  ].filter(Boolean); // Removes undefined, null, or empty strings
  
  // 2. Check if the origin matches any pattern
  const isAllowed = !origin || allowedPatterns.some(pattern => 
    pattern instanceof RegExp ? pattern.test(origin) : pattern === origin
  );

  if (isAllowed) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}

app.use(express.json());

app.use('/api', apiRouter);
app.use(errorHandler);

const startServer = async (retries = 10, delay = 3000) => {
  try {
    // 1. Authenticate connection directly via the instance
    await sequelize.authenticate();
    console.log('✅ Database connection authenticated successfully.');

    // 2. Runtime syncing removed. Tables are now managed explicitly via migrations.
    
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`🚀 LegacyVault Server running on http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    if (retries > 0) {
      console.warn(`⚠️  Connection failed, retrying in ${delay / 1000}s... (${retries} attempts left)`);
      setTimeout(() => startServer(retries - 1, delay), delay);
    } else {
      console.error('❌ Database connection critical failure:', error.message);
      process.exit(1);
    }
  }
};

startServer();

module.exports = app;