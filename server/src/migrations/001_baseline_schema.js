const { DataTypes } = require('sequelize');

/**
 * Migration 001: Baseline schema with performance indexes.
 *
 * This migration is completely idempotent:
 * - Creates users and interviews tables only if missing.
 * - Inspects existing data for duplicate roomIds before adding unique constraint.
 * - Creates performance and compound query indexes only if missing.
 * - Rollback (down) drops only the added indexes, preserving all user and interview data.
 */
module.exports = {
  up: async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();

    // 1. Ensure `users` table exists
    const usersExists = await queryInterface.tableExists('users');
    if (!usersExists) {
      await queryInterface.createTable('users', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        role: {
          type: DataTypes.ENUM('candidate', 'interviewer'),
          defaultValue: 'candidate',
          allowNull: false,
        },
        refreshToken: {
          type: DataTypes.TEXT,
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
    }

    // Ensure unique index on users.email
    const userIndexes = await queryInterface.showIndex('users');
    const hasUserEmailUnique = userIndexes.some(
      (idx) =>
        idx.unique &&
        idx.fields.some((f) => (typeof f === 'string' ? f === 'email' : f.attribute === 'email'))
    );
    if (!hasUserEmailUnique) {
      await queryInterface.addIndex('users', ['email'], {
        unique: true,
        name: 'users_email_unique',
      });
    }

    // 2. Ensure `interviews` table exists
    const interviewsExists = await queryInterface.tableExists('interviews');
    if (!interviewsExists) {
      await queryInterface.createTable('interviews', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        interviewerId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        candidateId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        title: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        scheduledAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        durationMinutes: {
          type: DataTypes.INTEGER,
          defaultValue: 60,
          allowNull: false,
        },
        endAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
          defaultValue: 'scheduled',
          allowNull: false,
        },
        roomId: {
          type: DataTypes.CHAR(36),
          allowNull: false,
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

    // 3. Inspect existing indexes on interviews
    const interviewIndexes = await queryInterface.showIndex('interviews');
    const hasIndex = (name, fieldList) =>
      interviewIndexes.some((idx) => {
        if (idx.name === name) return true;
        if (fieldList && Array.isArray(idx.fields)) {
          const names = idx.fields.map((f) => (typeof f === 'string' ? f : f.attribute));
          return names.join(',') === fieldList.join(',');
        }
        return false;
      });

    // Check for duplicate roomIds before creating unique index
    const [duplicates] = await sequelize.query(
      'SELECT roomId, COUNT(*) as cnt FROM interviews GROUP BY roomId HAVING cnt > 1'
    );
    if (duplicates && duplicates.length > 0) {
      throw new Error(
        `Cannot add unique index: duplicate roomId values found (${duplicates.length} duplicate groups). Deduplication required.`
      );
    }

    // Add unique index on roomId
    if (!hasIndex('interviews_room_id_unique', ['roomId'])) {
      await queryInterface.addIndex('interviews', ['roomId'], {
        unique: true,
        name: 'interviews_room_id_unique',
      });
    }

    // Add compound index on (interviewerId, scheduledAt)
    if (!hasIndex('interviews_interviewer_scheduled', ['interviewerId', 'scheduledAt'])) {
      await queryInterface.addIndex('interviews', ['interviewerId', 'scheduledAt'], {
        name: 'interviews_interviewer_scheduled',
      });
    }

    // Add compound index on (candidateId, scheduledAt)
    if (!hasIndex('interviews_candidate_scheduled', ['candidateId', 'scheduledAt'])) {
      await queryInterface.addIndex('interviews', ['candidateId', 'scheduledAt'], {
        name: 'interviews_candidate_scheduled',
      });
    }

    // Add index on status
    if (!hasIndex('interviews_status', ['status'])) {
      await queryInterface.addIndex('interviews', ['status'], {
        name: 'interviews_status',
      });
    }
  },

  down: async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();
    const interviewIndexes = await queryInterface.showIndex('interviews');

    const removeIfExists = async (indexName) => {
      if (interviewIndexes.some((idx) => idx.name === indexName)) {
        await queryInterface.removeIndex('interviews', indexName);
      }
    };

    // Safely remove created indexes only; do NOT drop tables or user data
    await removeIfExists('interviews_room_id_unique');
    await removeIfExists('interviews_interviewer_scheduled');
    await removeIfExists('interviews_candidate_scheduled');
    await removeIfExists('interviews_status');
  },
};
