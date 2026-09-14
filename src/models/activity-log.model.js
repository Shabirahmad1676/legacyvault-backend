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
      event_description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: 'activity_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );
};