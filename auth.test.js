/**
 * LegacyVault Authentication API Test Suite
 * Jest + Supertest
 * 
 * Installation:
 * npm install --save-dev jest supertest
 * 
 * Run tests:
 * npm test -- auth.test.js
 */

const request = require('supertest');
const app = require('../app');

const BASE_URL = 'http://localhost:5000';
let validToken = '';
let testEmail = `test_${Date.now()}@example.com`;
let testPassword = 'TestPass123!';

describe('Authentication API Tests', () => {
  
  // ============================================
  // SIGNUP TESTS
  // ============================================
  describe('POST /api/auth/signup', () => {
    
    // Happy Path
    describe('Happy Path - Valid Signup', () => {
      it('SIGNUP-001: Should successfully signup with valid email and password', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: testEmail,
            password: testPassword
          });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data.user).toHaveProperty('user_id');
        expect(response.body.data.user.email).toBe(testEmail);
        expect(response.body.data.user.quorum_threshold).toBe(2);
        expect(response.body.data).toHaveProperty('token');
        
        // Save token for later tests
        validToken = response.body.data.token;
      });

      it('SIGNUP-002: Should signup with minimum password length (8 chars)', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: `min_${Date.now()}@test.com`,
            password: 'Pass1234'
          });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
      });

      it('SIGNUP-005: Returned token should be valid JWT', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: `jwt_${Date.now()}@test.com`,
            password: testPassword
          });

        expect(response.status).toBe(201);
        const token = response.body.data.token;
        expect(token).toBeDefined();
        expect(token.split('.').length).toBe(3); // JWT has 3 parts
      });

      it('SIGNUP-006: New user should have default quorum_threshold of 2', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: `quorum_${Date.now()}@test.com`,
            password: testPassword
          });

        expect(response.status).toBe(201);
        expect(response.body.data.user.quorum_threshold).toBe(2);
      });
    });

    // Negative Testing
    describe('Negative Testing - Input Validation', () => {
      it('SIGNUP-101: Should reject request without email', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            password: testPassword
          });

        expect(response.status).toBe(400);
        expect(response.body.status).toBe('fail');
        expect(response.body.message).toContain('email');
      });

      it('SIGNUP-102: Should reject request without password', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: `nopass_${Date.now()}@test.com`
          });

        expect(response.status).toBe(400);
        expect(response.body.status).toBe('fail');
        expect(response.body.message).toContain('password');
      });

      it('SIGNUP-104: Should reject invalid email format', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 'userexample.com',
            password: testPassword
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('email');
      });

      it('SIGNUP-107: Should reject password shorter than 8 chars', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: `short_${Date.now()}@test.com`,
            password: 'Pass123'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('8 characters');
      });

      it('SIGNUP-106: Should reject non-string email', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: 12345,
            password: testPassword
          });

        expect(response.status).toBe(400);
      });

      it('SIGNUP-109: Should reject non-string password', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: `num_${Date.now()}@test.com`,
            password: 12345678
          });

        expect(response.status).toBe(400);
      });
    });

    // Edge Cases
    describe('Edge Cases - Boundary Constraints', () => {
      it('SIGNUP-201: Should reject email with leading/trailing spaces', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: ' test@example.com ',
            password: testPassword
          });

        expect(response.status).toBe(400);
      });

      it('SIGNUP-204: Should handle uppercase email (case sensitivity check)', async () => {
        const emailUpper = `UPPER_${Date.now()}@TEST.COM`;
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: emailUpper,
            password: testPassword
          });

        expect(response.status).toBe(201);
        // Note: Email should ideally be normalized to lowercase
      });

      it('SIGNUP-203: Should accept password with only special chars (8+ length)', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: `special_${Date.now()}@test.com`,
            password: '@#$%^&*(!'
          });

        expect(response.status).toBe(201);
      });
    });

    // Security Tests
    describe('Security & Token Manipulation', () => {
      it('SIGNUP-301: Should reject duplicate email registration', async () => {
        const duplicateEmail = `duplicate_${Date.now()}@test.com`;
        
        // First signup
        await request(app)
          .post('/api/auth/signup')
          .send({
            email: duplicateEmail,
            password: testPassword
          });

        // Second signup with same email
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: duplicateEmail,
            password: 'DifferentPass123!'
          });

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('already registered');
      });

      it('SIGNUP-302: Should reject SQL injection in email', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: "'; DROP TABLE users; --@test.com",
            password: testPassword
          });

        expect(response.status).toBe(400);
      });

      it('SIGNUP-303: Should reject XSS payload in email', async () => {
        const response = await request(app)
          .post('/api/auth/signup')
          .send({
            email: "<script>alert('xss')</script>@test.com",
            password: testPassword
          });

        expect(response.status).toBe(400);
      });
    });

    // State & Lifecycle
    describe('State & Lifecycle Scenarios', () => {
      it('SIGNUP-401: Should reject duplicate email in second signup attempt', async () => {
        const duplicateEmail = `lifecycle_${Date.now()}@test.com`;
        
        const firstSignup = await request(app)
          .post('/api/auth/signup')
          .send({
            email: duplicateEmail,
            password: testPassword
          });

        expect(firstSignup.status).toBe(201);

        const secondSignup = await request(app)
          .post('/api/auth/signup')
          .send({
            email: duplicateEmail,
            password: testPassword
          });

        expect(secondSignup.status).toBe(409);
      });

      it('SIGNUP-402: User should be able to login immediately after signup', async () => {
        const immediateEmail = `immediate_${Date.now()}@test.com`;
        
        const signupResponse = await request(app)
          .post('/api/auth/signup')
          .send({
            email: immediateEmail,
            password: testPassword
          });

        expect(signupResponse.status).toBe(201);

        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: immediateEmail,
            password: testPassword
          });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.data).toHaveProperty('token');
      });

      it('SIGNUP-403: Returned token should work immediately in protected endpoints', async () => {
        const protectedEmail = `protected_${Date.now()}@test.com`;
        
        const signupResponse = await request(app)
          .post('/api/auth/signup')
          .send({
            email: protectedEmail,
            password: testPassword
          });

        const token = signupResponse.body.data.token;

        // Use token to access protected endpoint (vault items)
        const protectedResponse = await request(app)
          .get('/api/vault-items')
          .set('Authorization', `Bearer ${token}`);

        expect(protectedResponse.status).toBe(200);
        expect(Array.isArray(protectedResponse.body.data)).toBe(true);
      });
    });
  });

  // ============================================
  // LOGIN TESTS
  // ============================================
  describe('POST /api/auth/login', () => {
    const loginEmail = `login_${Date.now()}@test.com`;

    beforeAll(async () => {
      // Create a user for login tests
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: loginEmail,
          password: testPassword
        });
    });

    // Happy Path
    describe('Happy Path - Valid Login', () => {
      it('LOGIN-001: Should successfully login with correct credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: loginEmail,
            password: testPassword
          });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.user.email).toBe(loginEmail);
        expect(response.body.data).toHaveProperty('token');
      });

      it('LOGIN-002: Each login should return a new token', async () => {
        const response1 = await request(app)
          .post('/api/auth/login')
          .send({
            email: loginEmail,
            password: testPassword
          });

        const response2 = await request(app)
          .post('/api/auth/login')
          .send({
            email: loginEmail,
            password: testPassword
          });

        expect(response1.body.data.token).not.toBe(response2.body.data.token);
      });
    });

    // Negative Testing
    describe('Negative Testing - Input Validation', () => {
      it('LOGIN-101: Should reject login without email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            password: testPassword
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('email');
      });

      it('LOGIN-102: Should reject login without password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: loginEmail
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('password');
      });

      it('LOGIN-104: Should reject invalid email format', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'invalidformat',
            password: testPassword
          });

        expect(response.status).toBe(400);
      });
    });

    // Edge Cases
    describe('Edge Cases - Boundary Constraints', () => {
      it('LOGIN-201: Should reject login with non-existent email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: testPassword
          });

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Invalid email or password');
      });

      it('LOGIN-202: Should reject login with wrong password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: loginEmail,
            password: 'WrongPassword123!'
          });

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Invalid email or password');
      });

      it('LOGIN-204: Password comparison should be case-sensitive', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: loginEmail,
            password: testPassword.toLowerCase()
          });

        expect(response.status).toBe(401);
      });
    });

    // Security Tests
    describe('Security & Token Manipulation', () => {
      it('LOGIN-301: Should reject SQL injection in email', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: "'; DROP TABLE users; --@test.com",
            password: testPassword
          });

        expect(response.status).toBe(400);
      });

      it('LOGIN-305: Should handle CORS preflight OPTIONS request', async () => {
        const response = await request(app)
          .options('/api/auth/login');

        expect(response.status).toBe(200);
      });
    });

    // State & Lifecycle
    describe('State & Lifecycle Scenarios', () => {
      it('LOGIN-401: User should be able to login after logout', async () => {
        const logoutLoginEmail = `logout_login_${Date.now()}@test.com`;
        
        // Signup
        const signupRes = await request(app)
          .post('/api/auth/signup')
          .send({
            email: logoutLoginEmail,
            password: testPassword
          });

        const token = signupRes.body.data.token;

        // Logout
        const logoutRes = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`);

        expect(logoutRes.status).toBe(200);

        // Login again
        const loginRes = await request(app)
          .post('/api/auth/login')
          .send({
            email: logoutLoginEmail,
            password: testPassword
          });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.data).toHaveProperty('token');
      });
    });
  });

  // ============================================
  // LOGOUT TESTS
  // ============================================
  describe('POST /api/auth/logout', () => {
    let logoutToken = '';

    beforeAll(async () => {
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `logout_${Date.now()}@test.com`,
          password: testPassword
        });

      logoutToken = signupRes.body.data.token;
    });

    // Happy Path
    describe('Happy Path - Valid Logout', () => {
      it('LOGOUT-001: Should successfully logout with valid token', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${logoutToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('Logged out');
      });
    });

    // Negative Testing
    describe('Negative Testing - Input Validation', () => {
      it('LOGOUT-101: Should reject logout without Authorization header', async () => {
        const response = await request(app)
          .post('/api/auth/logout');

        expect(response.status).toBe(401);
      });

      it('LOGOUT-102: Should reject logout with invalid token format', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', 'InvalidToken');

        expect(response.status).toBe(401);
      });

      it('LOGOUT-103: Should reject logout with malformed JWT', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', 'Bearer malformed.jwt.here');

        expect(response.status).toBe(401);
      });
    });

    // Edge Cases
    describe('Edge Cases - Boundary Constraints', () => {
      it('LOGOUT-202: Second logout with same token should fail', async () => {
        const newLogoutEmail = `double_logout_${Date.now()}@test.com`;
        
        const signupRes = await request(app)
          .post('/api/auth/signup')
          .send({
            email: newLogoutEmail,
            password: testPassword
          });

        const token = signupRes.body.data.token;

        // First logout
        const logout1 = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`);

        expect(logout1.status).toBe(200);

        // Second logout (should fail)
        const logout2 = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`);

        expect(logout2.status).toBe(401);
      });
    });

    // State & Lifecycle
    describe('State & Lifecycle Scenarios', () => {
      it('LOGOUT-401: Token should be invalid after logout on protected endpoint', async () => {
        const invalidTokenEmail = `invalid_after_logout_${Date.now()}@test.com`;
        
        const signupRes = await request(app)
          .post('/api/auth/signup')
          .send({
            email: invalidTokenEmail,
            password: testPassword
          });

        const token = signupRes.body.data.token;

        // Logout
        await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`);

        // Try to use token on protected endpoint
        const protectedRes = await request(app)
          .get('/api/vault-items')
          .set('Authorization', `Bearer ${token}`);

        expect(protectedRes.status).toBe(401);
      });
    });
  });

  // ============================================
  // QUORUM THRESHOLD TESTS
  // ============================================
  describe('PUT /api/auth/quorum-threshold', () => {
    let quorumToken = '';

    beforeAll(async () => {
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `quorum_threshold_${Date.now()}@test.com`,
          password: testPassword
        });

      quorumToken = signupRes.body.data.token;
    });

    // Happy Path
    describe('Happy Path - Valid Quorum Update', () => {
      it('QUORUM-001: Should successfully update quorum threshold', async () => {
        const response = await request(app)
          .put('/api/auth/quorum-threshold')
          .set('Authorization', `Bearer ${quorumToken}`)
          .send({
            quorum_threshold: 3
          });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.quorum_threshold).toBe(3);
      });

      it('QUORUM-002: Should update quorum to minimum value (1)', async () => {
        const response = await request(app)
          .put('/api/auth/quorum-threshold')
          .set('Authorization', `Bearer ${quorumToken}`)
          .send({
            quorum_threshold: 1
          });

        expect(response.status).toBe(200);
        expect(response.body.data.quorum_threshold).toBe(1);
      });
    });

    // Negative Testing
    describe('Negative Testing - Input Validation', () => {
      it('QUORUM-101: Should reject missing quorum_threshold field', async () => {
        const response = await request(app)
          .put('/api/auth/quorum-threshold')
          .set('Authorization', `Bearer ${quorumToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('quorum_threshold');
      });

      it('QUORUM-102: Should reject non-numeric quorum_threshold', async () => {
        const response = await request(app)
          .put('/api/auth/quorum-threshold')
          .set('Authorization', `Bearer ${quorumToken}`)
          .send({
            quorum_threshold: 'three'
          });

        expect(response.status).toBe(400);
      });

      it('QUORUM-103: Should reject decimal quorum_threshold', async () => {
        const response = await request(app)
          .put('/api/auth/quorum-threshold')
          .set('Authorization', `Bearer ${quorumToken}`)
          .send({
            quorum_threshold: 3.5
          });

        expect(response.status).toBe(400);
      });

      it('QUORUM-105: Should reject negative quorum_threshold', async () => {
        const response = await request(app)
          .put('/api/auth/quorum-threshold')
          .set('Authorization', `Bearer ${quorumToken}`)
          .send({
            quorum_threshold: -5
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('at least 1');
      });

      it('QUORUM-107: Should reject request without Authorization header', async () => {
        const response = await request(app)
          .put('/api/auth/quorum-threshold')
          .send({
            quorum_threshold: 3
          });

        expect(response.status).toBe(401);
      });
    });

    // Edge Cases
    describe('Edge Cases - Boundary Constraints', () => {
      it('QUORUM-104: Should reject zero quorum_threshold', async () => {
        const response = await request(app)
          .put('/api/auth/quorum-threshold')
          .set('Authorization', `Bearer ${quorumToken}`)
          .send({
            quorum_threshold: 0
          });

        expect(response.status).toBe(400);
      });

      it('QUORUM-204: Should allow updating threshold to same value', async () => {
        const response = await request(app)
          .put('/api/auth/quorum-threshold')
          .set('Authorization', `Bearer ${quorumToken}`)
          .send({
            quorum_threshold: 1
          });

        expect(response.status).toBe(200);
      });
    });

    // Security Tests
    describe('Security & Token Manipulation', () => {
      it('QUORUM-301: Should reject request with expired token', async () => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

        const response = await request(app)
          .put('/api/auth/quorum-threshold')
          .set('Authorization', `Bearer ${expiredToken}`)
          .send({
            quorum_threshold: 3
          });

        expect(response.status).toBe(401);
      });
    });

    // State & Lifecycle
    describe('State & Lifecycle Scenarios', () => {
      it('QUORUM-401: User should be able to update quorum immediately after login', async () => {
        const immediateQuorumEmail = `immediate_quorum_${Date.now()}@test.com`;
        
        const signupRes = await request(app)
          .post('/api/auth/signup')
          .send({
            email: immediateQuorumEmail,
            password: testPassword
          });

        const token = signupRes.body.data.token;

        const updateRes = await request(app)
          .put('/api/auth/quorum-threshold')
          .set('Authorization', `Bearer ${token}`)
          .send({
            quorum_threshold: 4
          });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.quorum_threshold).toBe(4);
      });
    });
  });
});

// ============================================
// CLEANUP (optional)
// ============================================
afterAll(async () => {
  // Add any cleanup logic here if needed
  console.log('Test suite completed');
});
