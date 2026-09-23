const { VaultItem, TrustedContact, AccessRequest } = require("../models");
const { BadRequestError, ForbiddenError, NotFoundError } = require("../errors/AppError");
const { encrypt, decrypt } = require("../utils/encryption.util");
const AuditLogService = require("./audit-log.service");

class VaultItemService {
  // CREATE
  static async createItem(owner_id, payload, clientMeta = {}) {
    const encryptedPayload = {
      ...payload,
      content: encrypt(payload.content),
    };

    const item = await VaultItem.create({
      owner_id,
      ...encryptedPayload,
    });

    await AuditLogService.log({
      vaultOwnerId: owner_id,
      actorId: owner_id,
      actionType: "VAULT_ITEM_CREATE",
      resourceType: "vault_item",
      resourceId: item.vault_item_id,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      eventDescription: `Created vault item: "${item.title}" (${item.category}).`,
    });

    return item;
  }

  // GET OWNER'S VAULT
  static async getItemsByOwner(owner_id) {
    const items = await VaultItem.findAll({
      where: { owner_id },
      order: [["created_at", "DESC"]],
    });

    return items.map((item) => {
      const data = item.toJSON();
      data.content = decrypt(data.content);
      return data;
    });
  }

  // GET SHARED VAULT
  static async getSharedItems(requester_id, owner_id, clientMeta = {}) {
    const trustLink = await TrustedContact.findOne({
      where: {
        owner_id,
        contact_id: requester_id,
      },
    });

    if (!trustLink) {
      await AuditLogService.log({
        vaultOwnerId: owner_id,
        actorId: requester_id,
        actionType: "UNAUTHORIZED_VAULT_ACCESS_ATTEMPT",
        status: "DENIED",
        ipAddress: clientMeta.ip,
        userAgent: clientMeta.userAgent,
        eventDescription: "Unauthorized user attempted to access shared vault.",
      });

      throw new ForbiddenError(
        "You are not a trusted contact for this vault."
      );
    }

    const approvedRequest = await AccessRequest.findOne({
      where: {
        trusted_contact_id: trustLink.trust_link_id,
        status: "approved",
      },
      order: [["created_at", "DESC"]],
    });

    const isUnlocked =
      approvedRequest &&
      approvedRequest.access_expires_at &&
      new Date(approvedRequest.access_expires_at) > new Date();

    const items = await VaultItem.findAll({
      where: { owner_id },
      order: [["created_at", "DESC"]],
    });

    let decryptedCount = 0;

    const results = items.map((item) => {
      const data = item.toJSON();
      const canRead = data.is_always_visible || isUnlocked;

      if (canRead) {
        data.content = decrypt(data.content);
        data.is_locked = false;
        decryptedCount++;
      } else {
        data.content = null;
        data.is_locked = true;
      }

      return data;
    });

    // Record read audit event when emergency or shared items are accessed
    if (isUnlocked || decryptedCount > 0) {
      await AuditLogService.log({
        vaultOwnerId: owner_id,
        actorId: requester_id,
        actionType: "VAULT_ITEM_READ",
        resourceType: "vault_item",
        ipAddress: clientMeta.ip,
        userAgent: clientMeta.userAgent,
        eventDescription: isUnlocked
          ? `Emergency access active: trusted contact accessed and decrypted ${decryptedCount} items.`
          : `Trusted contact accessed always-visible items (${decryptedCount} items).`,
        metadata: { decryptedCount, isUnlocked },
      });
    }

    return results;
  }

  // UPDATE
  static async updateItem(owner_id, vault_item_id, payload, clientMeta = {}) {
    const item = await VaultItem.findOne({
      where: {
        vault_item_id,
        owner_id,
      },
    });

    if (!item) {
      throw new NotFoundError(
        "Vault item not found or you do not have permission to edit it."
      );
    }

    const updatedPayload = {
      ...payload,
    };

    if (Object.prototype.hasOwnProperty.call(payload, "content")) {
      updatedPayload.content = encrypt(payload.content);
    }

    const updated = await item.update(updatedPayload);

    await AuditLogService.log({
      vaultOwnerId: owner_id,
      actorId: owner_id,
      actionType: "VAULT_ITEM_UPDATE",
      resourceType: "vault_item",
      resourceId: vault_item_id,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      eventDescription: `Updated vault item: "${item.title}".`,
    });

    return updated;
  }

  // DELETE
  static async deleteItem(owner_id, vault_item_id, clientMeta = {}) {
    const item = await VaultItem.findOne({
      where: {
        vault_item_id,
        owner_id,
      },
    });

    if (!item) {
      throw new NotFoundError(
        "Vault item not found or you do not have permission to delete it."
      );
    }

    const title = item.title;
    await item.destroy();

    await AuditLogService.log({
      vaultOwnerId: owner_id,
      actorId: owner_id,
      actionType: "VAULT_ITEM_DELETE",
      resourceType: "vault_item",
      resourceId: vault_item_id,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      eventDescription: `Deleted vault item: "${title}".`,
    });

    return {
      message: "Vault item deleted successfully.",
    };
  }
}

module.exports = VaultItemService;
