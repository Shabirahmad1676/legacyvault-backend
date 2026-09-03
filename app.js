require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize, testConnection } = require('./src/models');
const apiRouter = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);
app.use(require('./src/middleware/errorHandler'));

const startServer = async (retries = 10, delay = 3000) => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    
    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ PostgreSQL database tables synchronized.');
      app.listen(PORT, () => {
        console.log(`🚀 LegacyVault Server running on http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    if (retries > 0) {
      console.warn(`⚠️  Connection failed, retrying in ${delay / 1000}s... (${retries} attempts left)`);
      setTimeout(() => startServer(retries - 1, delay), delay);
    } else {
      console.error('❌ Database connection/sync failed:', error.message);
      process.exit(1);
    }
  }
};

startServer();

// Export the app for Supertest
module.exports = app;