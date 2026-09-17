const express = require('express');
const router = express.Router();

const AccessRequestController = require('../controllers/access-request.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { createRequestSchema } = require('../schemas/access-request.schema');

router.use(protect);

router.post('/', validate(createRequestSchema), AccessRequestController.createAccessRequest);
router.get('/incoming', AccessRequestController.getIncomingAccessRequests);
router.get('/to-vote', AccessRequestController.getRequestsToVote);
router.get('/outgoing', AccessRequestController.getOutgoingAccessRequests);

module.exports = router;
