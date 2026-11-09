const { DataTypes } = require('sequelize');

module.exports = {
  name: '004_code_execution_submissions',

  up: async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();
    const existingTables = await queryInterface.showAllTables();

    if (!existingTables.includes('submissions')) {
      await queryInterface.createTable('submissions', {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        questionId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'questions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        assessmentId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'assessments',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        language: {
          type: DataTypes.ENUM('javascript', 'python', 'java', 'cpp'),
          allowNull: false,
        },
        code: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed'),
          allowNull: false,
          defaultValue: 'queued',
        },
        resultStatus: {
          type: DataTypes.ENUM(
            'accepted',
            'wrong_answer',
            'compilation_error',
            'runtime_error',
            'time_limit_exceeded',
            'memory_limit_exceeded',
            'internal_error'
          ),
          allowNull: true,
        },
        passedTests: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        totalTests: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        executionTimeMs: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        memoryKb: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        stdout: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        stderr: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        compileOutput: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        testResults: {
          type: DataTypes.JSON,
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

      await queryInterface.addIndex('submissions', ['userId', 'createdAt'], {
        name: 'idx_submissions_user_created',
      });
      await queryInterface.addIndex('submissions', ['questionId'], {
        name: 'idx_submissions_question',
      });
      await queryInterface.addIndex('submissions', ['status'], {
        name: 'idx_submissions_status',
      });
    }
  },

  down: async ({ context: sequelize }) => {
    const queryInterface = sequelize.getQueryInterface();
    const existingTables = await queryInterface.showAllTables();

    if (existingTables.includes('submissions')) {
      await queryInterface.dropTable('submissions');
    }
  },
};
