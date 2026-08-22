const TrustedContactService = require('../services/trustedContact.service');
const asyncHandler = require('../middleware/asyncHandler');

class TrustedContactController {
  static addTrustedContact = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;
    const { contact_email, relationship_label } = req.body;

    const newContact = await TrustedContactService.addContact(owner_id, contact_email, relationship_label);

    res.status(201).json({ status: 'success', data: newContact });
  });

  static getTrustedContacts = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;
    const contacts = await TrustedContactService.getMyContacts(owner_id);

    res.status(200).json({ status: 'success', data: contacts });
  });

  static removeTrustedContact = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;
    const { id } = req.params;

    const result = await TrustedContactService.removeContact(owner_id, id);

    res.status(200).json({ status: 'success', message: result.message });
  });

  static add = this.addTrustedContact;
  static getAll = this.getTrustedContacts;
  static remove = this.removeTrustedContact;
}

module.exports = TrustedContactController;
