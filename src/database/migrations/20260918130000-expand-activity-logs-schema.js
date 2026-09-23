'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('activity_logs');

    if (!tableDescription.actor_id) {
      await queryInterface.addColumn('activity_logs', 'actor_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
      });
    }

    if (!tableDescription.action_type) {
      await queryInterface.addColumn('activity_logs', 'action_type', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }

    if (!tableDescription.resource_type) {
      await queryInterface.addColumn('activity_logs', 'resource_type', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }

    if (!tableDescription.resource_id) {
      await queryInterface.addColumn('activity_logs', 'resource_id', {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }

    if (!tableDescription.status) {
      await queryInterface.addColumn('activity_logs', 'status', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'SUCCESS',
      });
    }

    if (!tableDescription.ip_address) {
      await queryInterface.addColumn('activity_logs', 'ip_address', {
        type: Sequelize.STRING(45),
        allowNull: true,
      });
    }

    if (!tableDescription.user_agent) {
      await queryInterface.addColumn('activity_logs', 'user_agent', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    if (!tableDescription.metadata) {
      await queryInterface.addColumn('activity_logs', 'metadata', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableDescription.previous_hash) {
      await queryInterface.addColumn('activity_logs', 'previous_hash', {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
    }

    if (!tableDescription.record_hash) {
      await queryInterface.addColumn('activity_logs', 'record_hash', {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
    }

    // Add composite index for efficient ordered hash chain verification
    try {
      await queryInterface.addIndex('activity_logs', ['vault_owner_id', 'created_at'], {
        name: 'activity_logs_owner_created_idx',
      });
    } catch (idxErr) {
      // Index may already exist; safe to ignore
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('activity_logs');

    if (tableDescription.record_hash) await queryInterface.removeColumn('activity_logs', 'record_hash');
    if (tableDescription.previous_hash) await queryInterface.removeColumn('activity_logs', 'previous_hash');
    if (tableDescription.metadata) await queryInterface.removeColumn('activity_logs', 'metadata');
    if (tableDescription.user_agent) await queryInterface.removeColumn('activity_logs', 'user_agent');
    if (tableDescription.ip_address) await queryInterface.removeColumn('activity_logs', 'ip_address');
    if (tableDescription.status) await queryInterface.removeColumn('activity_logs', 'status');
    if (tableDescription.resource_id) await queryInterface.removeColumn('activity_logs', 'resource_id');
    if (tableDescription.resource_type) await queryInterface.removeColumn('activity_logs', 'resource_type');
    if (tableDescription.action_type) await queryInterface.removeColumn('activity_logs', 'action_type');
    if (tableDescription.actor_id) await queryInterface.removeColumn('activity_logs', 'actor_id');
  },
};

