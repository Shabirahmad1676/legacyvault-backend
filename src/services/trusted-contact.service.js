const { TrustedContact, User, AccessRequest, ActivityLog } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, BadRequestError, ConflictError } = require('../errors/AppError');

class TrustedContactService {
  static async addContact(owner_id, contact_email, relationship_label) {
    const contactUser = await User.findOne({ where: { email: contact_email } });
    if (!contactUser) {
      throw new NotFoundError('No user found with that email address.');
    }

    const contact_id = contactUser.user_id;

    if (owner_id === contact_id) {
      throw new BadRequestError('You cannot add yourself as a trusted contact.');
    }

    const existingLink = await TrustedContact.findOne({
      where: { owner_id, contact_id }
    });

    if (existingLink) {
      throw new ConflictError('This user is already a trusted contact.');
    }

    const link = await TrustedContact.create({
      owner_id,
      contact_id,
      relationship_label
    });

    await ActivityLog.create({
      vault_owner_id: owner_id,
      event_description: `Added ${contactUser.email} as a trusted contact (${relationship_label}).`,
    });

    return link;
  }

  static async getMyContacts(owner_id) {
    return await TrustedContact.findAll({
      where: { owner_id },
      include: [
        {
          model: User,
          as: 'delegate',
          attributes: ['user_id', 'username', 'email']
        }
      ]
    });
  }

  static async removeContact(owner_id, trust_link_id) {
    const link = await TrustedContact.findOne({
      where: { trust_link_id, owner_id },
      include: [
        {
          model: User,
          as: 'delegate',
          attributes: ['user_id', 'username', 'email']
        }
      ]
    });

    if (!link) {
      throw new NotFoundError('Trusted contact link not found.');
    }

    const delegateEmail = link.delegate ? link.delegate.email : 'Trusted contact';

    // Cancel pending requests initiated by this trusted contact
    await AccessRequest.update(
      { status: 'expired' },
      { where: { trusted_contact_id: trust_link_id, status: 'pending' } }
    );

    await ActivityLog.create({
      vault_owner_id: owner_id,
      event_description: `Trusted contact ${delegateEmail} was revoked. Any pending emergency access requests were canceled.`,
    });

    // Check if remaining contacts are fewer than current quorum threshold
    const remainingContactsCount = await TrustedContact.count({
      where: {
        owner_id,
        trust_link_id: { [Op.ne]: trust_link_id }
      }
    });

    const owner = await User.findByPk(owner_id);
    if (owner && remainingContactsCount > 0 && owner.quorum_threshold > remainingContactsCount) {
      await owner.update({ quorum_threshold: remainingContactsCount });
      await ActivityLog.create({
        vault_owner_id: owner_id,
        event_description: `Quorum threshold automatically adjusted to ${remainingContactsCount} to match remaining trusted contacts.`,
      });
    }

    await link.destroy();
    return { message: 'Trusted contact removed successfully. All associated requests and votes have been canceled.' };
  }

  static async getVaultsImTrustedOn(contact_id) {
    return await TrustedContact.findAll({
      where: { contact_id },
      include: [
        {
          model: User,
          as: 'vault_owner',
          attributes: ['user_id', 'email']
        }
      ]
    });
  }
}

module.exports = TrustedContactService;
