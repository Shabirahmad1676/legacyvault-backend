const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define(
    'ActivityLog',
    {
      log_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      vault_owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'CASCADE',
      },
      actor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
      },
      action_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      resource_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      resource_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'SUCCESS',
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      event_description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      previous_hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      record_hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
    },
    {
      tableName: 'activity_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          fields: ['vault_owner_id', 'created_at'],
        },
        {
          fields: ['actor_id'],
        },
        {
          fields: ['action_type'],
        },
      ],
    }
  );
};