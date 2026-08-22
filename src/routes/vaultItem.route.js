const express = require('express');
const router = express.Router();

const VaultItemController = require('../controllers/vaultItem.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { createItemSchema, updateItemSchema } = require('../schemas/vaultItem.schema');

router.use(protect);

router.post('/', validate(createItemSchema), VaultItemController.createVaultItem);
router.get('/', VaultItemController.getOwnerVaultItems);
router.get('/shared/:owner_id', VaultItemController.getSharedVaultItems);
router.put('/:id', validate(updateItemSchema), VaultItemController.updateVaultItem);
router.delete('/:id', VaultItemController.deleteVaultItem);

module.exports = router;
