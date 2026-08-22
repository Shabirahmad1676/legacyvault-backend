const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vote = sequelize.define('Vote', {
  vote_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  request_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  trusted_contact_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  decision: {
    type: DataTypes.ENUM('approve', 'deny'),
    allowNull: false,
  },
}, {
  tableName: 'votes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['request_id', 'trusted_contact_id'],
    }
  ]
});

module.exports = Vote;
