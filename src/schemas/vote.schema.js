const Joi = require('joi');

const castVoteSchema = Joi.object({
  decision: Joi.string().valid('approve', 'deny').required()
});

module.exports = {
  castVoteSchema
};
