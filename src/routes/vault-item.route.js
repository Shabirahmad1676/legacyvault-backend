const express = require('express');
const router = express.Router();

const VaultItemController = require('../controllers/vault-item.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { validateUuidParams, ensureNotSelf } = require('../middleware/authorize.middleware');
const { vaultDecryptionLimiter } = require('../middleware/rate-limiter.middleware');
const { createItemSchema, updateItemSchema } = require('../schemas/vault-item.schema');

router.use(protect);

router.post('/', validate(createItemSchema), VaultItemController.createVaultItem);
router.get('/', VaultItemController.getOwnerVaultItems);
router.get(
  '/shared/:owner_id',
  vaultDecryptionLimiter,
  validateUuidParams('owner_id'),
  ensureNotSelf('owner_id'),
  VaultItemController.getSharedVaultItems
);
router.put('/:id', validateUuidParams('id'), validate(updateItemSchema), VaultItemController.updateVaultItem);
router.delete('/:id', validateUuidParams('id'), VaultItemController.deleteVaultItem);

module.exports = router;
