const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define(
    'RefreshToken',
    {
      token_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'CASCADE',
      },
      token_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      family_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      replaced_by_token_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
    },
    {
      tableName: 'refresh_tokens',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          fields: ['token_hash'],
          unique: true,
        },
        {
          fields: ['user_id'],
        },
        {
          fields: ['family_id'],
        },
      ],
    }
  );
};

