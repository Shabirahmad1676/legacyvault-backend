const request = require('supertest');
const app = require('../app'); 
const { sequelize, User, TrustedContact, AccessRequest, Vote } = require('../src/models');

describe('LegacyVault API Integration Suite', () => {
  let ownerToken, ownerId, contactToken, contactId, strangerToken;
  let vaultItemId, trustLinkId, requestId;

  beforeAll(async () => {
    // Reset database for a clean test environment
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('1. Authentication & User Management', () => {
    test('Should sign up a new vault owner (Happy Path)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'owner@test.com', password: 'password123' });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('token');
      ownerToken = res.body.data.token;
      ownerId = res.body.data.user.user_id;
    });

    test('Should prevent duplicate email signups (Edge Case)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'owner@test.com', password: 'password123' });
      
      expect(res.statusCode).toBe(409);
    });

    test('Should log in successfully (Happy Path)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@test.com', password: 'password123' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.email).toBe('owner@test.com');
    });

    test('Should update quorum threshold (Happy Path)', async () => {
      const res = await request(app)
        .put('/api/auth/quorum-threshold')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ quorum_threshold: 2 });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.quorum_threshold).toBe(2);
    });
  });

  describe('2. Vault Item Management', () => {
    test('Should create a new vault item (Happy Path)', async () => {
      const res = await request(app)
        .post('/api/vault-items')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          category: 'password',
          title: 'Bank Login',
          content: 'user: admin, pass: 1234',
          is_always_visible: false
        });
      
      expect(res.statusCode).toBe(201);
      vaultItemId = res.body.data.vault_item_id;
    });

    test('Should list owner vault items (Happy Path)', async () => {
      const res = await request(app)
        .get('/api/vault-items')
        .set('Authorization', `Bearer ${ownerToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('Should reject invalid categories (Edge Case)', async () => {
      const res = await request(app)
        .post('/api/vault-items')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ category: 'invalid_cat', title: 'Test', content: 'Test' });
      
      expect(res.statusCode).toBe(400);
    });
  });

  describe('3. Trusted Contacts Network', () => {
    let contact2Token, contact2Id;

    beforeAll(async () => {
      // Create contact 1 (Bob), contact 2 (Charlie), and a stranger user
      const cRes = await request(app).post('/api/auth/signup').send({ username: 'contact1', email: 'contact@test.com', password: 'password123' });
      contactToken = cRes.body.data.token;
      contactId = cRes.body.data.user.user_id;

      const c2Res = await request(app).post('/api/auth/signup').send({ username: 'contact2', email: 'contact2@test.com', password: 'password123' });
      contact2Token = c2Res.body.data.token;
      contact2Id = c2Res.body.data.user.user_id;

      const sRes = await request(app).post('/api/auth/signup').send({ username: 'stranger', email: 'stranger@test.com', password: 'password123' });
      strangerToken = sRes.body.data.token;
    });

    test('Should prevent adding yourself as contact (Edge Case)', async () => {
      const res = await request(app)
        .post('/api/trusted-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ contact_email: 'owner@test.com', relationship_label: 'Self' });
      
      expect(res.statusCode).toBe(400);
    });

    test('Should add trusted contacts (Happy Path)', async () => {
      const res1 = await request(app)
        .post('/api/trusted-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ contact_email: 'contact@test.com', relationship_label: 'Sibling' });
      
      expect(res1.statusCode).toBe(201);
      trustLinkId = res1.body.data.trust_link_id;

      const res2 = await request(app)
        .post('/api/trusted-contacts')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ contact_email: 'contact2@test.com', relationship_label: 'Lawyer' });
      
      expect(res2.statusCode).toBe(201);
    });

    test('Should list assigned vaults for a contact (Happy Path)', async () => {
      const res = await request(app)
        .get('/api/trusted-contacts/assigned-vaults')
        .set('Authorization', `Bearer ${contactToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data[0].owner_id).toBe(ownerId);
    });
  });

  describe('4. Emergency Access & Consensus Engine', () => {
    let contact2Token;

    beforeAll(async () => {
      const c2Res = await request(app).post('/api/auth/login').send({ email: 'contact2@test.com', password: 'password123' });
      contact2Token = c2Res.body.data.token;
    });

    test('Should prevent stranger from requesting access (Edge Case)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ target_owner_id: ownerId, reason: 'Hacking attempt' });
      
      expect(res.statusCode).toBe(403);
    });

    test('Should create an access request (Happy Path)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${contactToken}`)
        .send({ target_owner_id: ownerId, reason: 'Medical emergency' });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.data.status).toBe('pending');
      requestId = res.body.data.request_id;
    });

    test('Should retrieve outgoing requests for requester (Happy Path)', async () => {
      const res = await request(app)
        .get('/api/access-requests/outgoing')
        .set('Authorization', `Bearer ${contactToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.some(r => r.request_id === requestId)).toBe(true);
    });

    test('Should prevent duplicate pending requests (Edge Case)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${contactToken}`)
        .send({ target_owner_id: ownerId, reason: 'Another emergency' });
      
      expect(res.statusCode).toBe(409);
    });

    test('Should prevent requester from voting on their own request (Edge Case)', async () => {
      const res = await request(app)
        .post(`/api/votes/request/${requestId}`)
        .set('Authorization', `Bearer ${contactToken}`)
        .send({ decision: 'approve' });
      
      expect(res.statusCode).toBe(403);
    });

    test('Should allow eligible peer contact to retrieve pending request to vote (Happy Path)', async () => {
      const res = await request(app)
        .get('/api/access-requests/to-vote')
        .set('Authorization', `Bearer ${contact2Token}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.some(r => r.request_id === requestId)).toBe(true);
    });

    test('Should cast vote and calculate quorum for approval (Happy Path)', async () => {
      const res = await request(app)
        .post(`/api/votes/request/${requestId}`)
        .set('Authorization', `Bearer ${contact2Token}`)
        .send({ decision: 'approve' });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.data.current_request_status).toBe('approved');
    });

    test('Should grant access to shared vault items after approval (Happy Path)', async () => {
      const res = await request(app)
        .get(`/api/vault-items/shared/${ownerId}`)
        .set('Authorization', `Bearer ${contactToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.some(item => item.content === 'user: admin, pass: 1234')).toBe(true);
    });
  });

  describe('5. Revocation & Cascading Deletes', () => {
    test('Should remove trusted contact and cancel pending requests cleanly (Happy Path)', async () => {
      const res = await request(app)
        .delete(`/api/trusted-contacts/${trustLinkId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      
      expect(res.statusCode).toBe(200);

      // Verify contact can no longer access shared items
      const vaultRes = await request(app)
        .get(`/api/vault-items/shared/${ownerId}`)
        .set('Authorization', `Bearer ${contactToken}`);
      
      expect(vaultRes.statusCode).toBe(403);
    });
  });
});