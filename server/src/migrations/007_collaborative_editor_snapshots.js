const { DataTypes } = require('sequelize');

module.exports = {
  name: '007_collaborative_editor_snapshots',

  async up({ context: sequelize }) {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    const hasTable = (name) => tables.includes(name) || tables.includes(name.toLowerCase());

    // 1. code_snapshots table
    if (!hasTable('code_snapshots')) {
      await queryInterface.createTable('code_snapshots', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        roomId: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        interviewId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'interviews', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        language: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: 'javascript',
        },
        codeContent: {
          type: DataTypes.TEXT('medium'),
          allowNull: false,
        },
        yjsUpdate: {
          type: DataTypes.BLOB('medium'),
          allowNull: true,
        },
        version: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        createdById: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('code_snapshots', ['roomId'], { name: 'code_snapshots_room_id_idx' });
      await queryInterface.addIndex('code_snapshots', ['interviewId'], { name: 'code_snapshots_interview_id_idx' });
      await queryInterface.addIndex('code_snapshots', ['createdAt'], { name: 'code_snapshots_created_at_idx' });
    }

    // 2. room_sessions table
    if (!hasTable('room_sessions')) {
      await queryInterface.createTable('room_sessions', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        roomId: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        interviewId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'interviews', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        role: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: 'candidate',
        },
        joinedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        leftAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        durationSeconds: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('room_sessions', ['roomId'], { name: 'room_sessions_room_id_idx' });
      await queryInterface.addIndex('room_sessions', ['interviewId'], { name: 'room_sessions_interview_id_idx' });
      await queryInterface.addIndex('room_sessions', ['userId'], { name: 'room_sessions_user_id_idx' });
    }
  },

  async down({ context: sequelize }) {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    const hasTable = (name) => tables.includes(name) || tables.includes(name.toLowerCase());

    if (hasTable('room_sessions')) {
      await queryInterface.dropTable('room_sessions');
    }
    if (hasTable('code_snapshots')) {
      await queryInterface.dropTable('code_snapshots');
    }
  },
};

