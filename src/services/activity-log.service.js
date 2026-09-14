const { ActivityLog } = require('../models');

class ActivityLogService {
  static async getLogsForUser(user_id) {
    const logs = await ActivityLog.findAll({
      where: { vault_owner_id: user_id },
      order: [['created_at', 'DESC']],
    });

    return logs;
  }
}

module.exports = ActivityLogService;
