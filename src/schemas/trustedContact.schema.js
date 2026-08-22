const Joi = require('joi');

const addContactSchema = Joi.object({
  contact_email: Joi.string().email().required(),
  relationship_label: Joi.string().required().max(50)
});

module.exports = {
  addContactSchema
};
