const express = require('express');
const router = express.Router();

const ActivityLogController = require('../controllers/activityLog.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', ActivityLogController.getLogs);

module.exports = router;
