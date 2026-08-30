const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().trim().max(500).optional().allow(''),
  is_active: Joi.boolean().optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  description: Joi.string().trim().max(500).optional().allow(''),
  is_active: Joi.boolean().optional(),
}).min(1);

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
