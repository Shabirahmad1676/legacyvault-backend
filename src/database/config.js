require('dotenv').config();

const pool = {
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  min: parseInt(process.env.DB_POOL_MIN || '0', 10),
  acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
  idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
};

const enableSSL = process.env.DB_SSL === 'true' || (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false');
const dialectOptions = enableSSL
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
      },
    }
  : {};

const productionConfig = process.env.DATABASE_URL
  ? {
      url: process.env.DATABASE_URL,
      dialect: 'postgres',
      dialectOptions,
      pool,
      logging: false,
    }
  : {
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      dialect: 'postgres',
      dialectOptions,
      pool,
      logging: false,
    };

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_NAME || 'legacyvault',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    pool,
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_TEST_NAME || process.env.DB_NAME || 'legacyvault',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    pool,
    logging: false,
  },
  production: productionConfig,
};