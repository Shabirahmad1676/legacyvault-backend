const TrustedContactService = require('../services/trusted-contact.service');
const asyncHandler = require('../middleware/async-handler.middleware');
const HTTP_STATUSES = require('../enums/httpStatuses');

class TrustedContactController {
  static addTrustedContact = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;
    const { contact_email, relationship_label } = req.body;

    const newContact = await TrustedContactService.addContact(owner_id, contact_email, relationship_label);

    
    res.status(HTTP_STATUSES.CREATED).json({ status: 'success', data: newContact });
  });

  static getTrustedContacts = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;
    const contacts = await TrustedContactService.getMyContacts(owner_id);

    res.status(HTTP_STATUSES.OK).json({ status: 'success', data: contacts });
  });

  static removeTrustedContact = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;
    const { id } = req.params;

    const result = await TrustedContactService.removeContact(owner_id, id);

    res.status(HTTP_STATUSES.OK).json({ status: 'success', message: result.message });
  });

  static getMyAssignedVaults = asyncHandler(async (req, res) => {
    const contact_id = req.user.user_id;
    const vaults = await TrustedContactService.getVaultsImTrustedOn(contact_id);
    res.status(HTTP_STATUSES.OK).json({ status: 'success', data: vaults });
  });

  static add = this.addTrustedContact;
  static getAll = this.getTrustedContacts;
  static remove = this.removeTrustedContact;
}

module.exports = TrustedContactController;
