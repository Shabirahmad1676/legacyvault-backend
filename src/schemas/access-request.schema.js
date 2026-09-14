const Joi = require('joi');

const createRequestSchema = Joi.object({
  target_owner_id: Joi.string().uuid().required(),
  reason: Joi.string().required().max(500)
});

module.exports = {
  createRequestSchema
};
