const { Category, User } = require('../models');
const { BadRequestError, NotFoundError, ConflictError } = require('../errors/AppError');

class CategoryService {
  static async createCategory(ownerId, payload) {
    const { name, description, is_active = true } = payload;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      throw new BadRequestError('Category name is required.');
    }

    const owner = await User.findByPk(ownerId);
    if (!owner) {
      throw new NotFoundError('User not found.');
    }

    const existingCategory = await Category.findOne({
      where: { owner_id: ownerId, name: trimmedName },
    });

    if (existingCategory) {
      throw new ConflictError('You already have a category with this name.');
    }

    const category = await Category.create({
      owner_id: ownerId,
      name: trimmedName,
      description: description || null,
      is_active,
    });

    return category;
  }

  static async getCategoriesByOwner(ownerId) {
    return Category.findAll({
      where: { owner_id: ownerId },
      order: [['created_at', 'DESC']],
    });
  }

  static async updateCategory(ownerId, categoryId, payload) {
    const category = await Category.findOne({
      where: { category_id: categoryId, owner_id: ownerId },
    });

    if (!category) {
      throw new NotFoundError('Category not found or you do not have permission to edit it.');
    }

    const updateData = { ...payload };
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }

    await category.update(updateData);
    return category;
  }

  static async deleteCategory(ownerId, categoryId) {
    const category = await Category.findOne({
      where: { category_id: categoryId, owner_id: ownerId },
    });

    if (!category) {
      throw new NotFoundError('Category not found or you do not have permission to delete it.');
    }

    await category.destroy();
    return { message: 'Category deleted.' };
  }
}

module.exports = CategoryService;
