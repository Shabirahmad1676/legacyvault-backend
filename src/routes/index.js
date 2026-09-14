const express = require('express');
const authRoutes = require('./auth.route');
const vaultItemRoutes = require('./vault-item.route');
const trustedContactRoutes = require('./trusted-contact.route');
const accessRequestRoutes = require('./access-request.route');
const voteRoutes = require('./vote.route');
const activityLogRoutes = require('./activity-log.route');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/vault-items', vaultItemRoutes);
router.use('/trusted-contacts', trustedContactRoutes);
router.use('/access-requests', accessRequestRoutes);
router.use('/votes', voteRoutes);
router.use('/activity-logs', activityLogRoutes);

module.exports = router;
