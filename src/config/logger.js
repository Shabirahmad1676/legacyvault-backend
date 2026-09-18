const pino = require('pino');
const pinoHttp = require('pino-http');
const crypto = require('crypto');

/**
 * Comprehensive list of sensitive keys to redact across request/response headers,
 * bodies, queries, and error objects.
 */
const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'newPassword',
  'currentPassword',
  'token',
  'resetToken',
  'refreshToken',
  'accessToken',
  'content', // Vault item plaintext
  'secret',
  'seed_phrase',
  'private_key',
  'VAULT_ENCRYPTION_KEY',
  'JWT_SECRET',
  'SMTP_PASSWORD',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.password_hash',
  '*.newPassword',
  '*.token',
  '*.content',
  '*.secret',
];

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
  redact: {
    paths: SENSITIVE_KEYS,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
  customLogLevel: (res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      remoteAddress: req.remoteAddress,
      // Strictly avoid logging full body by default; sanitized params only
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

module.exports = {
  logger,
  httpLogger,
};

