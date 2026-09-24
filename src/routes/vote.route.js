const express = require('express');
const router = express.Router();

const VoteController = require('../controllers/vote.controller');
const validate = require('../middleware/validate.middleware');
const { validateUuidParams } = require('../middleware/authorize.middleware');
const { votingLimiter } = require('../middleware/rate-limiter.middleware');
const { castVoteSchema } = require('../schemas/vote.schema');

const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post(
  '/request/:request_id',
  votingLimiter,
  validateUuidParams('request_id'),
  validate(castVoteSchema),
  VoteController.cast
);

module.exports = router;
