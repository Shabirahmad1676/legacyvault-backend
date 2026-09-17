const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

const getStore = () => {
  if (redisClient.isOpen && process.env.NODE_ENV !== 'test') {
    try {
      return new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
      });
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const globalLimiter = rateLimit({
  store: getStore(),
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

const authLimiter = rateLimit({
  store: getStore(),
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
};