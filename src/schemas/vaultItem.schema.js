const Joi = require('joi');

const createItemSchema = Joi.object({
  category: Joi.string().valid('password', 'document', 'instruction', 'asset').required(),
  title: Joi.string().required().max(255),
  content: Joi.string().required(),
  is_always_visible: Joi.boolean().default(false)
});

const updateItemSchema = Joi.object({
  category: Joi.string().valid('password', 'document', 'instruction', 'asset').optional(),
  title: Joi.string().optional().max(255),
  content: Joi.string().optional(),
  is_always_visible: Joi.boolean().optional()
}).min(1);

module.exports = {
  createItemSchema,
  updateItemSchema
};
