const express = require('express');
const authRoutes = require('./auth.route');
const vaultItemRoutes = require('./vaultItem.route');
const trustedContactRoutes = require('./trustedContact.route');
const accessRequestRoutes = require('./accessRequest.route');
const voteRoutes = require('./vote.route');
const activityLogRoutes = require('./activityLog.route');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/vault-items', vaultItemRoutes);
router.use('/trusted-contacts', trustedContactRoutes);
router.use('/access-requests', accessRequestRoutes);
router.use('/votes', voteRoutes);
router.use('/activity-logs', activityLogRoutes);

module.exports = router;
