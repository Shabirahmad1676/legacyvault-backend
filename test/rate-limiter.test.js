const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');

describe('Multi-Tiered Rate Limiter Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // 1. Password Reset Limiter (max 3 for testing)
    const testResetLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
      message: { status: 'fail', message: 'Too many password reset attempts.' },
    });

    // 2. Vault Decryption Limiter (max 5 for testing)
    const testDecryptLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: { status: 'fail', message: 'Decryption rate limit exceeded.' },
    });

    // 3. Voting Limiter (max 2 for testing)
    const testVotingLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      message: { status: 'fail', message: 'Voting rate limit exceeded.' },
    });

    app.post('/test/forgot-password', testResetLimiter, (req, res) => {
      res.status(200).json({ status: 'success' });
    });

    app.get('/test/decrypt', testDecryptLimiter, (req, res) => {
      res.status(200).json({ status: 'success' });
    });

    app.post('/test/vote', testVotingLimiter, (req, res) => {
      res.status(200).json({ status: 'success' });
    });
  });

  test('Password reset limiter throttles after 3 requests', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/test/forgot-password');
      expect(res.statusCode).toBe(200);
    }

    // 4th request must be rejected with 429
    const blockedRes = await request(app).post('/test/forgot-password');
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.body.message).toMatch(/Too many password reset attempts/);
  });

  test('Vault decryption limiter throttles after 5 requests', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/test/decrypt');
      expect(res.statusCode).toBe(200);
    }

    // 6th request must be rejected with 429
    const blockedRes = await request(app).get('/test/decrypt');
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.body.message).toMatch(/Decryption rate limit exceeded/);
  });

  test('Voting limiter throttles after 2 votes', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await request(app).post('/test/vote');
      expect(res.statusCode).toBe(200);
    }

    // 3rd vote must be rejected with 429
    const blockedRes = await request(app).post('/test/vote');
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.body.message).toMatch(/Voting rate limit exceeded/);
  });
});

