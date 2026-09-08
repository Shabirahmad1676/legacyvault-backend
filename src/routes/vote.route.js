const express = require('express');
const router = express.Router();

const VoteController = require('../controllers/vote.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { castVoteSchema } = require('../schemas/vote.schema');

router.use(protect);

router.post('/request/:request_id', validate(castVoteSchema), VoteController.cast);

module.exports = router;
