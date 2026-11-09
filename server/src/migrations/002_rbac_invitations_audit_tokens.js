const { DataTypes } = require('sequelize');

/**
 * Migration 002: RBAC, Invitations, Token Families, Audit Logs, and Platform Settings.
 *
 * Idempotently:
 * - Extends users.role to include 'admin' and adds users.isActive flag.
 * - Creates invitations table for single-use token invitations.
 * - Creates refresh_tokens table for token families and reuse detection.
 * - Creates audit_logs table for security and admin event logging.
 * - Creates platform_settings table for platform key/value configuration.
 *
 * Rollback (down):
 * - Drops created tables (platform_settings, audit_logs, refresh_tokens, invitations).
 * - Reverts users.role and removes users.isActive.
 */
module.exports = {
  up: async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    // 1. Extend users table: role enum and isActive column
    const userTableDesc = await queryInterface.describeTable('users');

    if (!userTableDesc.isActive) {
      await queryInterface.addColumn('users', 'isActive', {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      });
    }

    // Expand role enum to include 'admin'
    await sequelize.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('candidate', 'interviewer', 'admin') NOT NULL DEFAULT 'candidate';"
    );

    // 2. Invitations table
    const invitationsExists = await queryInterface.tableExists('invitations');
    if (!invitationsExists) {
      await queryInterface.createTable('invitations', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        role: {
          type: DataTypes.ENUM('interviewer', 'admin'),
          allowNull: false,
        },
        tokenHash: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        revokedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        usedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        invitedById: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });

      await queryInterface.addIndex('invitations', ['email'], { name: 'invitations_email' });
      await queryInterface.addIndex('invitations', ['tokenHash'], { unique: true, name: 'invitations_token_hash_unique' });
    }

    // 3. Refresh Tokens table (Token families & reuse detection)
    const refreshTokensExists = await queryInterface.tableExists('refresh_tokens');
    if (!refreshTokensExists) {
      await queryInterface.createTable('refresh_tokens', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        tokenHash: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
        },
        familyId: {
          type: DataTypes.STRING(36),
          allowNull: false,
        },
        userAgent: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        ipAddress: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        revokedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        replacedBy: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });

      await queryInterface.addIndex('refresh_tokens', ['tokenHash'], { unique: true, name: 'refresh_tokens_token_hash_unique' });
      await queryInterface.addIndex('refresh_tokens', ['userId', 'familyId'], { name: 'refresh_tokens_user_family' });
    }

    // 4. Audit Logs table
    const auditLogsExists = await queryInterface.tableExists('audit_logs');
    if (!auditLogsExists) {
      await queryInterface.createTable('audit_logs', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        actorId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        action: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        targetType: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        targetId: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        ipAddress: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });

      await queryInterface.addIndex('audit_logs', ['actorId', 'createdAt'], { name: 'audit_logs_actor_created' });
      await queryInterface.addIndex('audit_logs', ['action'], { name: 'audit_logs_action' });
      await queryInterface.addIndex('audit_logs', ['createdAt'], { name: 'audit_logs_created_at' });
    }

    // 5. Platform Settings table
    const platformSettingsExists = await queryInterface.tableExists('platform_settings');
    if (!platformSettingsExists) {
      await queryInterface.createTable('platform_settings', {
        key: {
          type: DataTypes.STRING(100),
          primaryKey: true,
          allowNull: false,
        },
        value: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        updatedById: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
    }
  },

  down: async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    if (await queryInterface.tableExists('platform_settings')) {
      await queryInterface.dropTable('platform_settings');
    }
    if (await queryInterface.tableExists('audit_logs')) {
      await queryInterface.dropTable('audit_logs');
    }
    if (await queryInterface.tableExists('refresh_tokens')) {
      await queryInterface.dropTable('refresh_tokens');
    }
    if (await queryInterface.tableExists('invitations')) {
      await queryInterface.dropTable('invitations');
    }

    const userTableDesc = await queryInterface.describeTable('users');
    if (userTableDesc.isActive) {
      await queryInterface.removeColumn('users', 'isActive');
    }

    // Revert role enum safely (demoting any remaining admin to interviewer first)
    await sequelize.query("UPDATE users SET role = 'interviewer' WHERE role = 'admin';");
    await sequelize.query("ALTER TABLE users MODIFY COLUMN role ENUM('candidate', 'interviewer') NOT NULL DEFAULT 'candidate';");
  },
};

