const Joi = require('joi');

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long.'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const quorumThresholdSchema = Joi.object({
  quorum_threshold: Joi.number().integer().min(1).required()
});

module.exports = {
  signupSchema,
  loginSchema,
  quorumThresholdSchema
};
