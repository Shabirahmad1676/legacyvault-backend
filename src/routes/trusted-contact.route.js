const express = require('express');
const router = express.Router();

const TrustedContactController = require('../controllers/trusted-contact.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { addContactSchema } = require('../schemas/trusted-contact.schema');

router.use(protect);

router.post('/', validate(addContactSchema), TrustedContactController.addTrustedContact);
router.get('/', TrustedContactController.getTrustedContacts);
router.get('/assigned-vaults', TrustedContactController.getMyAssignedVaults);
router.delete('/:id', TrustedContactController.removeTrustedContact);

module.exports = router;
