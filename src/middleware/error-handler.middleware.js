const { logger } = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = Boolean(err.isOperational);
  const status = err.status || (String(statusCode).startsWith('4') ? 'fail' : 'error');
  const requestId = req.id || req.headers?.['x-request-id'] || null;

  // Log error using structured logger with redaction (never raw console.error!)
  logger.error({
    err: {
      message: err.message,
      name: err.name,
      statusCode,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    },
    requestId,
    url: req.originalUrl || req.url,
    method: req.method,
  }, 'Request error encountered');

  const isProduction = process.env.NODE_ENV === 'production';

  // In production, do not leak internal database or system errors
  const userMessage = isProduction && !isOperational && statusCode === 500
    ? 'An unexpected internal server error occurred. Please contact support if the issue persists.'
    : err.message;

  res.status(statusCode).json({
    status,
    message: userMessage,
    requestId,
    stack: !isProduction ? err.stack : undefined,
  });
};

module.exports = errorHandler;
