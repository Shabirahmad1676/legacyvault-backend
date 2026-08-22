const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VaultItem = sequelize.define('VaultItem', {
  vault_item_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  owner_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('password', 'document', 'instruction', 'asset'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  is_always_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'vault_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = VaultItem;
