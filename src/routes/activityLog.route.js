const express = require('express');
const router = express.Router();

const { ActivityLog } = require('../models');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const logs = await ActivityLog.findAll({
      where: { vault_owner_id: req.user.user_id },
      order: [['created_at', 'DESC']],
    });

    res.status(200).json({ status: 'success', data: logs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
