const VaultItemService = require('../services/vault-item.service');
const asyncHandler = require('../middleware/async-handler.middleware');
const HTTP_STATUSES = require('../enums/httpStatuses');

class VaultItemController {
  static createVaultItem = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;
    const item = await VaultItemService.createItem(owner_id, req.body);

    res.status(HTTP_STATUSES.CREATED).json({ status: 'success', data: item });
  });

  static getOwnerVaultItems = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;
    const items = await VaultItemService.getItemsByOwner(owner_id);

    res.status(HTTP_STATUSES.OK).json({ status: 'success', data: items });
  });

  static getSharedVaultItems = asyncHandler(async (req, res) => {
    const items = await VaultItemService.getSharedItems(req.user.user_id, req.params.owner_id);
    res.status(HTTP_STATUSES.OK).json({ status: 'success', data: items });
  });

  static updateVaultItem = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;
    const { id } = req.params;

    const updatedItem = await VaultItemService.updateItem(owner_id, id, req.body);


    res.status(HTTP_STATUSES.OK).json({ status: 'success', data: updatedItem });
  });

  static deleteVaultItem = asyncHandler(async (req, res) => {
    const owner_id = req.user.user_id;
    const { id } = req.params;

    await VaultItemService.deleteItem(owner_id, id);

    res.status(HTTP_STATUSES.OK).json({ status: 'success', message: 'Item deleted.' });
  });
}

module.exports = VaultItemController;
