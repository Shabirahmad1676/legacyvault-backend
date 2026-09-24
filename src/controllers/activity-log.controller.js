const asyncHandler = require('../middleware/async-handler.middleware');
const ActivityLogService = require('../services/activity-log.service');
const HTTP_STATUSES = require('../enums/httpStatuses');

class ActivityLogController {
  static getLogs = asyncHandler(async (req, res) => {
    const logs = await ActivityLogService.getLogsForUser(req.user.user_id);
    return res.status(HTTP_STATUSES.OK).json({ status: 'success', data: logs });
  });

  static verifyIntegrity = asyncHandler(async (req, res) => {
    const verification = await ActivityLogService.verifyChain(req.user.user_id);
    return res.status(HTTP_STATUSES.OK).json({
      status: 'success',
      data: verification,
    });
  });
}

module.exports = ActivityLogController;
