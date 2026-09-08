const express = require('express');
const router = express.Router();

const AccessRequestController = require('../controllers/accessRequest.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { createRequestSchema } = require('../schemas/accessRequest.schema');

router.use(protect);

router.post('/', validate(createRequestSchema), AccessRequestController.createAccessRequest);
router.get('/incoming', AccessRequestController.getIncomingAccessRequests);
router.get('/to-vote', AccessRequestController.getRequestsToVote);

module.exports = router;
