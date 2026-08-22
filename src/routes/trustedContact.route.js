const express = require('express');
const router = express.Router();

const TrustedContactController = require('../controllers/trustedContact.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { addContactSchema } = require('../schemas/trustedContact.schema');

router.use(protect);

router.post('/', validate(addContactSchema), TrustedContactController.addTrustedContact);
router.get('/', TrustedContactController.getTrustedContacts);
router.delete('/:id', TrustedContactController.removeTrustedContact);

module.exports = router;
