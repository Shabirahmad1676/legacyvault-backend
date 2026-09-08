const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
  log_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vault_owner_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  event_description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'activity_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = ActivityLog;
