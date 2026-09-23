const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');

const getStore = (prefix = 'rl:') => {
  if (process.env.NODE_ENV === 'test') {
    return undefined;
  }

  try {
    return new RedisStore({
      sendCommand: async (...args) => {
        if (!redisClient.isOpen) {
          throw new Error('Redis client is not connected');
        }
        return redisClient.sendCommand(args);
      },
      prefix,
    });
  } catch (err) {
    return undefined;
  }
};

const commonRateLimitOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true, // Prevents 500 crashes if Redis encounters momentary connectivity spikes
};

const globalLimiter = rateLimit({
  ...commonRateLimitOptions,
  store: getStore('rl:global:'),
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

const authLimiter = rateLimit({
  ...commonRateLimitOptions,
  store: getStore('rl:auth:'),
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    status: 'fail',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
});

const passwordResetLimiter = rateLimit({
  ...commonRateLimitOptions,
  store: getStore('rl:reset:'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    status: 'fail',
    message: 'Too many password reset attempts from this IP, please try again after 1 hour.',
  },
});

const vaultDecryptionLimiter = rateLimit({
  ...commonRateLimitOptions,
  store: getStore('rl:decrypt:'),
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    status: 'fail',
    message: 'Vault decryption rate limit exceeded. Please wait a minute before requesting more items.',
  },
});

const votingLimiter = rateLimit({
  ...commonRateLimitOptions,
  store: getStore('rl:vote:'),
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    status: 'fail',
    message: 'Voting rate limit exceeded. Please wait a minute before casting another vote.',
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  vaultDecryptionLimiter,
  votingLimiter,
};