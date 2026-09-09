const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vote = sequelize.define(
  'Vote',
  {
    vote_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    request_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'access_requests',
        key: 'request_id',
      },
      onDelete: 'CASCADE',
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
    decision: {
      type: DataTypes.ENUM('approve', 'deny'),
      allowNull: false,
    },
  },
  {
    tableName: 'votes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['request_id', 'trusted_contact_id'],
      },
    ],
  }
);

module.exports = Vote;