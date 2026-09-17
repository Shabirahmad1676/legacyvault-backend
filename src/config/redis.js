const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 2) {
        return false; // Stop retrying after 2 attempts
      }
      return 500;
    },
  },
});

redisClient.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️ Redis Client Warning:', err.message);
  }
});

const connectRedis = async () => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('✅ Redis connected successfully.');
    }
  } catch (err) {
    console.warn('⚠️ Redis connection failed. Rate limiting will fallback to in-memory store.');
  }
};

connectRedis();

module.exports = redisClient;