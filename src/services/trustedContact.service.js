const { TrustedContact, User } = require('../models');
const AppError = require('../errors/AppError');

class TrustedContactService {
  static async addContact(owner_id, contact_email, relationship_label) {
    const contactUser = await User.findOne({ where: { email: contact_email } });
    if (!contactUser) {
      throw new AppError('No user found with that email address.', 404);
    }

    const contact_id = contactUser.user_id;

    if (owner_id === contact_id) {
      throw new AppError('You cannot add yourself as a trusted contact.', 400);
    }

    const existingLink = await TrustedContact.findOne({
      where: { owner_id, contact_id }
    });

    if (existingLink) {
      throw new AppError('This user is already a trusted contact.', 409);
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
      throw new AppError('Trusted contact link not found.', 404);
    }

    await link.destroy();
    return { message: 'Trusted contact removed successfully. All associated requests and votes have been canceled.' };
  }
}

module.exports = TrustedContactService;
