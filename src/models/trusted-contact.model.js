const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TrustedContact = sequelize.define(
  'TrustedContact',
  {
    trust_link_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    contact_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    relationship_label: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    tableName: 'trusted_contacts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['owner_id', 'contact_id'],
      },
    ],
  }
);

module.exports = TrustedContact;