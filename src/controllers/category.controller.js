const CategoryService = require('../services/category.service');
const asyncHandler = require('../middleware/asyncHandler');

class CategoryController {
  static createCategory = asyncHandler(async (req, res) => {
    const category = await CategoryService.createCategory(req.user.user_id, req.body);
    const HTTP_STATUSES = require('../enums/httpStatuses');
    res.status(HTTP_STATUSES.CREATED).json({ status: 'success', data: category });
  });

  static getMyCategories = asyncHandler(async (req, res) => {
    const categories = await CategoryService.getCategoriesByOwner(req.user.user_id);
    const HTTP_STATUSES = require('../enums/httpStatuses');
    res.status(HTTP_STATUSES.OK).json({ status: 'success', data: categories });
  });

  static updateCategory = asyncHandler(async (req, res) => {
    const category = await CategoryService.updateCategory(req.user.user_id, req.params.id, req.body);
    const HTTP_STATUSES = require('../enums/httpStatuses');
    res.status(HTTP_STATUSES.OK).json({ status: 'success', data: category });
  });

  static deleteCategory = asyncHandler(async (req, res) => {
    const result = await CategoryService.deleteCategory(req.user.user_id, req.params.id);
    const HTTP_STATUSES = require('../enums/httpStatuses');
    res.status(HTTP_STATUSES.OK).json({ status: 'success', message: result.message });
  });
}

module.exports = CategoryController;
