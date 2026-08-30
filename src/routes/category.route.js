const express = require('express');
const router = express.Router();

const CategoryController = require('../controllers/category.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { createCategorySchema, updateCategorySchema } = require('../schemas/category.schema');

router.use(protect);

router.post('/', validate(createCategorySchema), CategoryController.createCategory);
router.get('/', CategoryController.getMyCategories);
router.put('/:id', validate(updateCategorySchema), CategoryController.updateCategory);
router.delete('/:id', CategoryController.deleteCategory);

module.exports = router;
