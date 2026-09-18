const request = require('supertest');
const app = require('../app');
const { sequelize, User, RefreshToken } = require('../src/models');
const TokenService = require('../src/services/token.service');

jest.setTimeout(30000);

describe('Dual-Token (JWT + RTR) & Brute Force Lockout Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const testUser = {
    username: 'testvaultuser',
    email: 'testvaultuser@example.com',
    password: 'ValidPassword123!',
  };

  let accessToken;
  let refreshTokenCookie;

  test('1. Signup should return accessToken and set HttpOnly refreshToken cookie', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('token'); // backward compatibility
    expect(res.headers['set-cookie']).toBeDefined();

    const cookieStr = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    expect(cookieStr).toBeDefined();
    expect(cookieStr).toMatch(/HttpOnly/i);

    accessToken = res.body.data.accessToken;
    refreshTokenCookie = cookieStr.split(';')[0];
  });

  test('2. Login should authenticate, reset failed attempts, and issue fresh tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.headers['set-cookie']).toBeDefined();

    const cookieStr = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    refreshTokenCookie = cookieStr.split(';')[0];
  });

  test('3. Token Refresh should successfully rotate refresh token (RTR)', async () => {
    const oldCookie = refreshTokenCookie;

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [oldCookie]);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');

    const newCookieStr = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    expect(newCookieStr).toBeDefined();

    const newCookie = newCookieStr.split(';')[0];
    expect(newCookie).not.toBe(oldCookie);

    // Save rotated cookie for next tests
    refreshTokenCookie = newCookie;

    // 4. Token Reuse Detection: Attempting to use the OLD (already rotated) cookie must fail and trigger family revocation!
    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [oldCookie]);

    expect(reuseRes.statusCode).toBe(401);
    expect(reuseRes.body.message).toMatch(/reuse detected/i);

    // Because family was revoked, even the newly rotated token should now be invalid!
    const familyCheckRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [refreshTokenCookie]);

    expect(familyCheckRes.statusCode).toBe(401);
  });

  test('5. Brute-force protection: 5 failed attempts locks the account', async () => {
    // Attempt 1 to 4 should fail with invalid password
    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword123!' });
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Invalid email or password/i);
    }

    // 5th attempt locks the account
    const lockRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword123!' });
    expect(lockRes.statusCode).toBe(401);
    expect(lockRes.body.message).toMatch(/Account is temporarily locked/i);

    // 6th attempt (even with CORRECT password) should remain locked
    const lockedWithCorrectPass = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(lockedWithCorrectPass.statusCode).toBe(401);
    expect(lockedWithCorrectPass.body.message).toMatch(/Account is temporarily locked/i);
  });
});

