const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Connection pooling options with sensible production defaults & ENV configurability
const poolOptions = {
  max: parseInt(process.env.DB_POOL_MAX || (isProduction ? '10' : '5'), 10),
  min: parseInt(process.env.DB_POOL_MIN || '0', 10),
  acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
  idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
  evict: parseInt(process.env.DB_POOL_EVICT || '1000', 10),
};

// SSL configuration for cloud hosted databases (AWS RDS, Neon, Supabase, Render, etc.)
const enableSSL = process.env.DB_SSL === 'true' || (isProduction && process.env.DB_SSL !== 'false');
const dialectOptions = enableSSL
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
      },
    }
  : {};

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: poolOptions,
    dialectOptions,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'legacyvault',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: poolOptions,
      dialectOptions,
    }
  );
}

module.exports = sequelize;
