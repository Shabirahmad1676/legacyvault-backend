const { VaultItem, TrustedContact, AccessRequest } = require("../models");

const { BadRequestError, ForbiddenError } = require("../errors/AppError");

const { encrypt, decrypt } = require("../utils/encryption.util");

class VaultItemService {
  // CREATE
  static async createItem(owner_id, payload) {
    const encryptedPayload = {
      ...payload, content: encrypt(payload.content),
    };

    return await VaultItem.create({
      owner_id,
      ...encryptedPayload,
    });
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
  static async getSharedItems(requester_id, owner_id) {
    const trustLink = await TrustedContact.findOne({
      where: {
        owner_id,
        contact_id: requester_id,
      },
    });

    if (!trustLink) {
      throw new ForbiddenError("You are not a trusted contact for this vault.");
    }

    const approvedRequest = await AccessRequest.findOne({
      where: {
        trusted_contact_id: trustLink.trust_link_id,
        status: 'approved',
      },
      order: [['created_at', 'DESC']],
    });

    const isUnlocked =
      approvedRequest &&
      approvedRequest.access_expires_at &&
      new Date(approvedRequest.access_expires_at) > new Date();

    let items;

    if (isUnlocked) {
      items = await VaultItem.findAll({
        where: { owner_id },
        order: [["created_at", "DESC"]],
      });
    } else {
      items = await VaultItem.findAll({
        where: {
          owner_id,
          is_always_visible: true,
        },
        order: [["created_at", "DESC"]],
      });
    }

    return items.map((item) => {
      const data = item.toJSON();

      data.content = decrypt(data.content);

      return data;
    });
  }

  // UPDATE
  static async updateItem(owner_id, vault_item_id, payload) {
    const item = await VaultItem.findOne({
      where: {
        vault_item_id,
        owner_id,
      },
    });

    if (!item) {
      const { NotFoundError } = require("../errors/AppError");

      throw new NotFoundError(
        "Vault item not found or you do not have permission to edit it.",
      );
    }

    const updatedPayload = {
      ...payload,
    };

    // Only encrypt content when content is being changed
    if (Object.prototype.hasOwnProperty.call(payload, "content")) {
      updatedPayload.content = encrypt(payload.content);
    }

    return await item.update(updatedPayload);
  }

  // DELETE
  static async deleteItem(owner_id, vault_item_id) {
    const item = await VaultItem.findOne({
      where: {
        vault_item_id,
        owner_id,
      },
    });

    if (!item) {
      const { NotFoundError } = require("../errors/AppError");

      throw new NotFoundError(
        "Vault item not found or you do not have permission to delete it.",
      );
    }

    await item.destroy();

    return {
      message: "Vault item deleted successfully.",
    };
  }
}

module.exports = VaultItemService;
