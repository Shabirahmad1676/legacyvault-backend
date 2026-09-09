const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AccessRequest = sequelize.define(
  'AccessRequest',
  {
    request_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    trusted_contact_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'trusted_contacts',
        key: 'trust_link_id',
      },
      onDelete: 'CASCADE',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'denied', 'expired'),
      defaultValue: 'pending',
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Voting window expiry (e.g., 7 days)',
    },
    access_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Decryption reading window expiry (e.g., 24 hours after approval)',
    },
  },
  {
    tableName: 'access_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = AccessRequest;