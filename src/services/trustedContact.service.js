const { TrustedContact, User } = require('../models');
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

    return await TrustedContact.create({
      owner_id,
      contact_id,
      relationship_label
    });
  }

  static async getMyContacts(owner_id) {
    return await TrustedContact.findAll({
      where: { owner_id },
      include: [
        {
          model: User,
          as: 'delegate',
          attributes: ['user_id', 'email']
        }
      ]
    });
  }

  static async removeContact(owner_id, trust_link_id) {
    const link = await TrustedContact.findOne({ where: { trust_link_id, owner_id } });

    if (!link) {
      throw new NotFoundError('Trusted contact link not found.');
    }

    await link.destroy();
    return { message: 'Trusted contact removed successfully. All associated requests and votes have been canceled.' };
  }
}

module.exports = TrustedContactService;
