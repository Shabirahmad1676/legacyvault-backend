const crypto = require('crypto');
const AuditLogService = require('../src/services/audit-log.service');
const { ActivityLog } = require('../src/models');

describe('Cryptographic Tamper-Evident Audit Log Chain Tests', () => {
  const vaultOwnerId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const actorId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  describe('1. HMAC Signature Computation & Collision Resistance', () => {
    test('Should compute deterministic 64-character hex HMAC hash', () => {
      const data = {
        vault_owner_id: vaultOwnerId,
        actor_id: actorId,
        action_type: 'AUTH_LOGIN_SUCCESS',
        resource_type: 'user',
        resource_id: vaultOwnerId,
        status: 'SUCCESS',
        event_description: 'User logged in.',
        metadata: { ip: '127.0.0.1' },
        created_at: new Date('2026-09-18T12:00:00.000Z'),
      };

      const hash1 = AuditLogService.computeRecordHash('0'.repeat(64), data);
      const hash2 = AuditLogService.computeRecordHash('0'.repeat(64), data);

      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64);
      expect(hash1).toBe(hash2);
    });

    test('Altering any field must change the resulting record_hash', () => {
      const baseData = {
        vault_owner_id: vaultOwnerId,
        actor_id: actorId,
        action_type: 'VAULT_ITEM_READ',
        resource_type: 'vault_item',
        resource_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        status: 'SUCCESS',
        event_description: 'Emergency directive decrypted.',
        metadata: { decryptedCount: 1 },
        created_at: new Date('2026-09-18T12:00:00.000Z'),
      };

      const originalHash = AuditLogService.computeRecordHash('0'.repeat(64), baseData);

      // Tamper description
      const tamperedData = { ...baseData, event_description: 'Malicious alteration' };
      const tamperedHash = AuditLogService.computeRecordHash('0'.repeat(64), tamperedData);

      expect(tamperedHash).not.toBe(originalHash);
    });
  });

  describe('2. In-Memory Chain Verification & Tamper Detection', () => {
    let mockChain = [];

    beforeEach(() => {
      mockChain = [];

      // Build a 3-block valid chain
      const genesisPrev = '0'.repeat(64);
      const log1Data = {
        vault_owner_id: vaultOwnerId,
        actor_id: actorId,
        action_type: 'AUTH_LOGIN_SUCCESS',
        event_description: 'Login',
        status: 'SUCCESS',
        created_at: new Date('2026-09-18T12:00:00.000Z'),
      };
      const log1Hash = AuditLogService.computeRecordHash(genesisPrev, log1Data);
      mockChain.push({
        log_id: 'log-1',
        ...log1Data,
        previous_hash: genesisPrev,
        record_hash: log1Hash,
      });

      const log2Data = {
        vault_owner_id: vaultOwnerId,
        actor_id: actorId,
        action_type: 'VAULT_ITEM_CREATE',
        event_description: 'Created Item',
        status: 'SUCCESS',
        created_at: new Date('2026-09-18T12:01:00.000Z'),
      };
      const log2Hash = AuditLogService.computeRecordHash(log1Hash, log2Data);
      mockChain.push({
        log_id: 'log-2',
        ...log2Data,
        previous_hash: log1Hash,
        record_hash: log2Hash,
      });

      const log3Data = {
        vault_owner_id: vaultOwnerId,
        actor_id: actorId,
        action_type: 'VAULT_ITEM_READ',
        event_description: 'Read Item',
        status: 'SUCCESS',
        created_at: new Date('2026-09-18T12:02:00.000Z'),
      };
      const log3Hash = AuditLogService.computeRecordHash(log2Hash, log3Data);
      mockChain.push({
        log_id: 'log-3',
        ...log3Data,
        previous_hash: log2Hash,
        record_hash: log3Hash,
      });
    });

    test('Should verify an untampered contiguous hash chain as valid', async () => {
      jest.spyOn(ActivityLog, 'findAll').mockResolvedValueOnce(mockChain);

      const verification = await AuditLogService.verifyChainIntegrity(vaultOwnerId);
      expect(verification.isValid).toBe(true);
      expect(verification.totalRecords).toBe(3);
    });

    test('Should detect content tampering within an existing record and identify tampered log ID', async () => {
      // Modify record 2 content in DB
      mockChain[1].event_description = 'Hacked description in database';

      jest.spyOn(ActivityLog, 'findAll').mockResolvedValueOnce(mockChain);

      const verification = await AuditLogService.verifyChainIntegrity(vaultOwnerId);
      expect(verification.isValid).toBe(false);
      expect(verification.tamperedRecordId).toBe('log-2');
      expect(verification.reason).toMatch(/signature invalid|content was tampered with/i);
    });

    test('Should detect deleted row from middle of chain (broken link detection)', async () => {
      // Remove record 2, leaving log-1 and log-3
      const brokenChain = [mockChain[0], mockChain[2]];

      jest.spyOn(ActivityLog, 'findAll').mockResolvedValueOnce(brokenChain);

      const verification = await AuditLogService.verifyChainIntegrity(vaultOwnerId);
      expect(verification.isValid).toBe(false);
      expect(verification.tamperedRecordId).toBe('log-3');
      expect(verification.reason).toMatch(/Broken chain link/i);
    });
  });
});

