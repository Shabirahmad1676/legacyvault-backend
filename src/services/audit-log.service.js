const crypto = require('crypto');
const { ActivityLog } = require('../models');

const GENESIS_HASH = '0'.repeat(64);

class AuditLogService {
  /**
   * Derives the HMAC secret used to sign audit log blocks.
   * @private
   */
  static getAuditSecret() {
    const secret = process.env.AUDIT_LOG_SECRET || process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL CONFIGURATION ERROR: AUDIT_LOG_SECRET or JWT_SECRET must be defined in production environment.');
    }
    return secret || 'legacyvault_default_audit_integrity_secret_change_in_prod';
  }

  /**
   * Computes deterministic canonical HMAC-SHA256 hash for an audit record.
   * @param {string} previousHash 
   * @param {Object} data 
   * @returns {string} 64-character hex HMAC string
   */
  static computeRecordHash(previousHash, data) {
    const secret = this.getAuditSecret();
    const metadataStr = typeof data.metadata === 'string'
      ? data.metadata
      : JSON.stringify(data.metadata || {});

    // Canonical representation ensuring strict consistency
    const canonicalString = [
      previousHash || GENESIS_HASH,
      data.vault_owner_id,
      data.actor_id || '',
      data.action_type || '',
      data.resource_type || '',
      data.resource_id || '',
      data.status || 'SUCCESS',
      data.event_description || '',
      metadataStr,
      new Date(data.created_at).toISOString(),
    ].join('|');

    return crypto
      .createHmac('sha256', secret)
      .update(canonicalString)
      .digest('hex');
  }

  /**
   * Appends an immutable, cryptographically chained audit log record.
   *
   * @param {Object} params
   * @param {string} params.vaultOwnerId Target vault owner
   * @param {string} [params.actorId] Performing user (or null for system)
   * @param {string} params.actionType Categorized action enum
   * @param {string} [params.resourceType] e.g. 'vault_item', 'access_request'
   * @param {string} [params.resourceId] Target resource UUID
   * @param {string} [params.status] 'SUCCESS', 'FAILURE', 'DENIED'
   * @param {string} [params.ipAddress] Caller IP
   * @param {string} [params.userAgent] Caller User-Agent
   * @param {Object|string} [params.metadata] Additional structured payload
   * @param {string} params.eventDescription Human-readable summary
   * @param {Object} [params.transaction] Optional DB transaction
   * @returns {Promise<ActivityLog>}
   */
  static async log({
    vaultOwnerId,
    actorId = null,
    actionType,
    resourceType = null,
    resourceId = null,
    status = 'SUCCESS',
    ipAddress = null,
    userAgent = null,
    metadata = null,
    eventDescription,
    transaction = null,
  }) {
    // 1. Fetch the latest record in the owner's chain
    const lastRecord = await ActivityLog.findOne({
      where: { vault_owner_id: vaultOwnerId },
      order: [
        ['created_at', 'DESC'],
        ['log_id', 'DESC'],
      ],
      transaction,
    });

    const previousHash = lastRecord ? (lastRecord.record_hash || GENESIS_HASH) : GENESIS_HASH;
    const createdAt = new Date();

    const metadataStr = typeof metadata === 'object' && metadata !== null
      ? JSON.stringify(metadata)
      : metadata;

    const recordHash = this.computeRecordHash(previousHash, {
      vault_owner_id: vaultOwnerId,
      actor_id: actorId,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      status,
      event_description: eventDescription,
      metadata: metadataStr,
      created_at: createdAt,
    });

    return await ActivityLog.create(
      {
        vault_owner_id: vaultOwnerId,
        actor_id: actorId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        status,
        ip_address: ipAddress ? String(ipAddress).slice(0, 45) : null,
        user_agent: userAgent ? String(userAgent).slice(0, 255) : null,
        metadata: metadataStr,
        event_description: eventDescription,
        previous_hash: previousHash,
        record_hash: recordHash,
        created_at: createdAt,
      },
      { transaction }
    );
  }

  /**
   * Verifies the cryptographic HMAC hash chain integrity for an entire owner audit log trail.
   * Detects any direct DB updates, deletions, or unauthorized row insertions.
   *
   * @param {string} vaultOwnerId 
   * @returns {Promise<{ isValid: boolean, totalRecords: number, tamperedRecordId?: string, reason?: string }>}
   */
  static async verifyChainIntegrity(vaultOwnerId) {
    const logs = await ActivityLog.findAll({
      where: { vault_owner_id: vaultOwnerId },
      order: [
        ['created_at', 'ASC'],
        ['log_id', 'ASC'],
      ],
    });

    if (!logs.length) {
      return { isValid: true, totalRecords: 0 };
    }

    let expectedPreviousHash = GENESIS_HASH;

    for (let i = 0; i < logs.length; i++) {
      const record = logs[i];

      // If legacy un-hashed records exist at genesis, chain begins at first hashed entry
      if (!record.record_hash) {
        continue;
      }

      // Check 1: Does previous_hash match the previous record's record_hash?
      if (record.previous_hash !== expectedPreviousHash) {
        return {
          isValid: false,
          totalRecords: logs.length,
          tamperedRecordId: record.log_id,
          reason: `Broken chain link at index ${i}: expected previous_hash ${expectedPreviousHash}, found ${record.previous_hash}`,
        };
      }

      // Check 2: Re-calculate HMAC-SHA256 signature to verify row contents were not altered
      const recomputedHash = this.computeRecordHash(record.previous_hash, {
        vault_owner_id: record.vault_owner_id,
        actor_id: record.actor_id,
        action_type: record.action_type,
        resource_type: record.resource_type,
        resource_id: record.resource_id,
        status: record.status,
        event_description: record.event_description,
        metadata: record.metadata,
        created_at: record.created_at,
      });

      if (record.record_hash !== recomputedHash) {
        return {
          isValid: false,
          totalRecords: logs.length,
          tamperedRecordId: record.log_id,
          reason: `Cryptographic signature invalid at record ${record.log_id}: content was tampered with!`,
        };
      }

      expectedPreviousHash = record.record_hash;
    }

    return {
      isValid: true,
      totalRecords: logs.length,
    };
  }
}

module.exports = AuditLogService;

