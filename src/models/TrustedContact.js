const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TrustedContact = sequelize.define('TrustedContact', {
  trust_link_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  owner_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  contact_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  relationship_label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'trusted_contacts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['owner_id', 'contact_id'],
    }
  ]
});

module.exports = TrustedContact;
