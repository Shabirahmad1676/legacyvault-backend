const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AccessRequest = sequelize.define('AccessRequest', {
  request_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  trusted_contact_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'expired'),
    defaultValue: 'pending',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'access_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = AccessRequest;
