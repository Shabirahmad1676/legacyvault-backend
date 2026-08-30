const asyncHandler = require('../middleware/asyncHandler');
const ActivityLogService = require('../services/activityLog.service');
const HTTP_STATUSES = require('../enums/httpStatuses');

class ActivityLogController {
  static getLogs = asyncHandler(async (req, res) => {
    const logs = await ActivityLogService.getLogsForUser(req.user.user_id);

    return res.status(HTTP_STATUSES.OK).json({ status: 'success', data: logs });
  });
}

module.exports = ActivityLogController;
