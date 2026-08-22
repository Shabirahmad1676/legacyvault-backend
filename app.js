// Load environment variables immediately before any other code
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

const startServer = async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    console.log('✅ PostgreSQL database tables synchronized.');

    app.listen(PORT, () => {
      console.log(`🚀 LegacyVault Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Database connection/sync failed:', error.message);
    process.exit(1);
  }
};

startServer();
