const { VaultItem, TrustedContact, AccessRequest } = require('../models');
const { BadRequestError, ForbiddenError } = require('../errors/AppError');

class VaultItemService {
  static async createItem(owner_id, payload) {
    return await VaultItem.create({
      owner_id,
      ...payload,
    });
  }

  static async getItemsByOwner(owner_id) {
    return await VaultItem.findAll({
      where: { owner_id },
      order: [['created_at', 'DESC']],
    });
  }

  static async getSharedItems(requester_id, owner_id) {
    const trustLink = await TrustedContact.findOne({
      where: { owner_id, contact_id: requester_id }
    });

    if (!trustLink) {
      throw new ForbiddenError('You are not a trusted contact for this vault.');
    }

    const approvedRequest = await AccessRequest.findOne({
      where: {
        trusted_contact_id: trustLink.trust_link_id,
        status: 'approved'
      }
    });

    const isUnlocked = approvedRequest && new Date(approvedRequest.expires_at) > new Date();

    if (isUnlocked) {
      return await VaultItem.findAll({
        where: { owner_id },
        order: [['created_at', 'DESC']],
      });
    }

    return await VaultItem.findAll({
      where: { owner_id, is_always_visible: true },
      order: [['created_at', 'DESC']],
    });
  }

  static async updateItem(owner_id, vault_item_id, payload) {
    const item = await VaultItem.findOne({ where: { vault_item_id, owner_id } });

    if (!item) {
      const { NotFoundError } = require('../errors/AppError');
      throw new NotFoundError('Vault item not found or you do not have permission to edit it.');
    }

    return await item.update(payload);
  }

  static async deleteItem(owner_id, vault_item_id) {
    const item = await VaultItem.findOne({ where: { vault_item_id, owner_id } });

    if (!item) {
      const { NotFoundError } = require('../errors/AppError');
      throw new NotFoundError('Vault item not found or you do not have permission to delete it.');
    }

    await item.destroy();
    return { message: 'Vault item deleted successfully.' };
  }
}

module.exports = VaultItemService;
