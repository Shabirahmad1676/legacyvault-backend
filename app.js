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
app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);
app.use(errorHandler);

const startServer = async (retries = 10, delay = 3000) => {
  try {
    // 1. Authenticate connection directly via the instance
    await sequelize.authenticate();
    console.log('✅ Database connection authenticated successfully.');

    // 2. Syncing tables (CTO Note: Swap this out for Migrations in production!)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ PostgreSQL database tables synchronized.');
    }
    
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
      console.error('❌ Database connection/sync critical failure:', error.message);
      process.exit(1);
    }
  }
};

startServer();

module.exports = app;
