const { logger } = require('../src/config/logger');
const errorHandler = require('../src/middleware/error-handler.middleware');
const pino = require('pino');

describe('Logger Redaction & Error Sanitization Tests', () => {
  test('Pino logger should automatically redact passwords, tokens, and vault contents', () => {
    const logs = [];
    const customStream = {
      write: (chunk) => {
        logs.push(JSON.parse(chunk));
      },
    };

    const redactingLogger = pino({
      redact: {
        paths: [
          'password',
          '*.password',
          'token',
          'content',
          'nested.secret',
        ],
        censor: '[REDACTED]',
      },
    }, customStream);

    const sensitivePayload = {
      password: 'MySecretPassword123!',
      password_hash: '$argon2id$v=19$m=65536...',
      token: 'jwt.token.string',
      content: 'seed-phrase-alpha-bravo-charlie',
      regularField: 'ThisIsSafeToLog',
      nested: {
        password: 'NestedPassword!',
        secret: 'UltraSecret',
      },
    };

    redactingLogger.info(sensitivePayload, 'User payload logged');

    expect(logs.length).toBe(1);
    const loggedObj = logs[0];

    expect(loggedObj.password).toBe('[REDACTED]');
    expect(loggedObj.token).toBe('[REDACTED]');
    expect(loggedObj.content).toBe('[REDACTED]');
    expect(loggedObj.nested.password).toBe('[REDACTED]');
    expect(loggedObj.nested.secret).toBe('[REDACTED]');
    expect(loggedObj.regularField).toBe('ThisIsSafeToLog');
  });

  test('Error handler should sanitize 500 error messages in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const req = {
      id: 'test-req-123',
      method: 'POST',
      url: '/api/vault',
    };

    let responseStatus;
    let responseBody;
    const res = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseBody = data;
          },
        };
      },
    };

    const next = jest.fn();

    // Simulate an unexpected internal database error
    const dbError = new Error('pg_query error: column "xyz" does not exist at postgres:5432');
    dbError.statusCode = 500;
    dbError.isOperational = false;

    errorHandler(dbError, req, res, next);

    expect(responseStatus).toBe(500);
    expect(responseBody.status).toBe('error');
    // Database connection details or SQL error must NOT be leaked
    expect(responseBody.message).toBe('An unexpected internal server error occurred. Please contact support if the issue persists.');
    expect(responseBody.stack).toBeUndefined();
    expect(responseBody.requestId).toBe('test-req-123');

    process.env.NODE_ENV = originalEnv;
  });
});

