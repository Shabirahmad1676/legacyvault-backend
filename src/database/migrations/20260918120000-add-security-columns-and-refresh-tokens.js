'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Inspect existing columns on users table to avoid "column already exists" errors
    const userTableDescription = await queryInterface.describeTable('users');

    if (!userTableDescription.password_changed_at) {
      await queryInterface.addColumn('users', 'password_changed_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!userTableDescription.failed_login_attempts) {
      await queryInterface.addColumn('users', 'failed_login_attempts', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }

    if (!userTableDescription.locked_until) {
      await queryInterface.addColumn('users', 'locked_until', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // 2. Check if refresh_tokens table already exists before creating
    const tables = await queryInterface.showAllTables();
    const normalizedTables = tables.map((t) => (typeof t === 'object' && t.tableName ? t.tableName : t));

    if (!normalizedTables.includes('refresh_tokens')) {
      await queryInterface.createTable('refresh_tokens', {
        token_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'user_id',
          },
          onDelete: 'CASCADE',
        },
        token_hash: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true,
        },
        family_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        revoked_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        replaced_by_token_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        user_agent: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        ip_address: {
          type: Sequelize.STRING(45),
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });

      await queryInterface.addIndex('refresh_tokens', ['token_hash'], {
        unique: true,
        name: 'refresh_tokens_hash_unique',
      });

      await queryInterface.addIndex('refresh_tokens', ['user_id'], {
        name: 'refresh_tokens_user_id_idx',
      });

      await queryInterface.addIndex('refresh_tokens', ['family_id'], {
        name: 'refresh_tokens_family_id_idx',
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const normalizedTables = tables.map((t) => (typeof t === 'object' && t.tableName ? t.tableName : t));

    if (normalizedTables.includes('refresh_tokens')) {
      await queryInterface.dropTable('refresh_tokens');
    }

    const userTableDescription = await queryInterface.describeTable('users');

    if (userTableDescription.locked_until) {
      await queryInterface.removeColumn('users', 'locked_until');
    }

    if (userTableDescription.failed_login_attempts) {
      await queryInterface.removeColumn('users', 'failed_login_attempts');
    }

    if (userTableDescription.password_changed_at) {
      await queryInterface.removeColumn('users', 'password_changed_at');
    }
  },
};
