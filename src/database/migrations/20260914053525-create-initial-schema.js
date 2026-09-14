'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Users Table
    await queryInterface.createTable('users', {
      user_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: Sequelize.STRING(30),
        allowNull: true,
        unique: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      reset_password_token_hash: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      reset_password_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      quorum_threshold: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 2,
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

    // 2. Trusted Contacts Table
    await queryInterface.createTable('trusted_contacts', {
      trust_link_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'CASCADE',
      },
      contact_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'CASCADE',
      },
      relationship_label: {
        type: Sequelize.STRING(50),
        allowNull: false,
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

    await queryInterface.addIndex('trusted_contacts', ['owner_id', 'contact_id'], {
      unique: true,
      name: 'trusted_contacts_owner_contact_unique',
    });

    // 3. Vault Items Table
    await queryInterface.createTable('vault_items', {
      vault_item_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'CASCADE',
      },
      category: {
        type: Sequelize.ENUM('password', 'document', 'instruction', 'asset'),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      is_always_visible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    // 4. Access Requests Table
    await queryInterface.createTable('access_requests', {
      request_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      trusted_contact_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'trusted_contacts', key: 'trust_link_id' },
        onDelete: 'CASCADE',
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'denied', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      access_expires_at: {
        type: Sequelize.DATE,
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

    // 5. Votes Table
    await queryInterface.createTable('votes', {
      vote_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'access_requests', key: 'request_id' },
        onDelete: 'CASCADE',
      },
      trusted_contact_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'trusted_contacts', key: 'trust_link_id' },
        onDelete: 'CASCADE',
      },
      decision: {
        type: Sequelize.ENUM('approve', 'deny'),
        allowNull: false,
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

    await queryInterface.addIndex('votes', ['request_id', 'trusted_contact_id'], {
      unique: true,
      name: 'votes_request_contact_unique',
    });

    // 6. Activity Logs Table
    await queryInterface.createTable('activity_logs', {
      log_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      vault_owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
        onDelete: 'CASCADE',
      },
      event_description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs');
    await queryInterface.dropTable('votes');
    await queryInterface.dropTable('access_requests');
    await queryInterface.dropTable('vault_items');
    await queryInterface.dropTable('trusted_contacts');
    await queryInterface.dropTable('users');
  },
};