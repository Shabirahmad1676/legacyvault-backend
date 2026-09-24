const { ActivityLog, User } = require('../models');
const AuditLogService = require('./audit-log.service');

class ActivityLogService {
  static async getLogsForUser(user_id) {
    const logs = await ActivityLog.findAll({
      where: { vault_owner_id: user_id },
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['user_id', 'username', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return logs;
  }

  static async verifyChain(user_id) {
    return await AuditLogService.verifyChainIntegrity(user_id);
  }
}

module.exports = ActivityLogService;
